const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');
const path = require('path');
const svgCaptcha = require('svg-captcha');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const multer = require('multer');
const fs = require('fs');

const app = express();
const port = 3000;
const secretKey = 'your_secret_key';

// 数据库配置
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// 连接数据库
db.connect((err) => {
    if (err) {
        console.error('数据库连接失败:', err);
        process.exit(1);
    }
    console.log('成功连接到 MySQL 数据库');

    // 创建订单表
    const createOrdersTable = `
        CREATE TABLE IF NOT EXISTS orders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL,
            product_id INT NOT NULL,
            product_name VARCHAR(255) NOT NULL,
            product_price DECIMAL(10,2) NOT NULL,
            product_image TEXT NOT NULL,
            order_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            reviewed TINYINT(1) DEFAULT 0,
            FOREIGN KEY (username) REFERENCES users(username),
            FOREIGN KEY (product_id) REFERENCES products(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    db.query(createOrdersTable, (err) => {
        if (err) {
            console.error('创建订单表失败:', err);
            return;
        }
        console.log('订单表创建成功或已存在');
    });

    // 创建地址表
    const createAddressTable = `
        CREATE TABLE IF NOT EXISTS addresses (
            username VARCHAR(255) PRIMARY KEY,
            name VARCHAR(50) NOT NULL,
            phone VARCHAR(20) NOT NULL,
            address TEXT NOT NULL,
            FOREIGN KEY (username) REFERENCES users(username)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    db.query(createAddressTable, (err) => {
        if (err) {
            console.error('创建地址表失败:', err);
            return;
        }
        console.log('地址表创建成功或已存在');
    });

    // 创建购物车表
    const createCartTable = `
        CREATE TABLE IF NOT EXISTS cart (
            username VARCHAR(255),
            product_id INT,
            quantity INT NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (username, product_id),
            FOREIGN KEY (username) REFERENCES users(username),
            FOREIGN KEY (product_id) REFERENCES products(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    db.query(createCartTable, (err) => {
        if (err) {
            console.error('创建购物车表失败:', err);
            return;
        }
        console.log('购物车表创建成功或已存在');
    });

    // 添加头像字段到用户表
    const alterUserTable = `
        ALTER TABLE users
        ADD COLUMN avatar_url VARCHAR(255)
    `;

    db.query(alterUserTable, (err) => {
        if (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') {
                console.error('添加头像字段失败:', err);
                return;
            }
        }
        console.log('用户表头像字段添加成功或已存在');
    });
});

// 先配置 session
app.use(session({
    store: new FileStore({
        path: path.join(__dirname, 'sessions'),
        ttl: 86400, // 过期时间，单位秒
        reapInterval: 3600 // 清理过期session的时间间隔，单位秒
    }),
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 1000 * 60 * 60 * 24 // 24小时
    }
}));

// 基础中间件配置
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));  // 添加这行来处理表单数据

// 静态文件服务配置
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// 配置文件上传
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'public/uploads/avatars';
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        // 使用用户名作为文件名的一部分，确保每个用户的头像是唯一的
        const username = req.user.username;
        cb(null, `${username}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 限制5MB
    },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('只能上传图片文件'));
        }
        cb(null, true);
    }
});

// JWT 验证中间件
function authenticateJWT(req, res, next) {
    const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: '未提供令牌' });
    }
    jwt.verify(token, secretKey, (err, user) => {
        if (err) return res.status(403).json({ error: '令牌验证失败' });
        req.user = user;
        next();
    });
}

// ================= 用户管理 =================

// 用户注册接口
app.post('/api/register', async (req, res) => {
    const { username, password, email } = req.body;

    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err) return res.status(500).send('数据库错误');
        if (results.length > 0) return res.status(400).send('用户名已存在');

        const hashedPassword = await bcrypt.hash(password, 10);
        db.query('INSERT INTO users (username, password, email) VALUES (?, ?, ?)', 
            [username, hashedPassword, email],
            (err) => {
                if (err) return res.status(500).send('注册失败');
                res.status(201).send('用户注册成功');
            }
        );
    });
});

// 用户登录接口
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err) return res.status(500).send('数据库错误');
        if (results.length === 0) return res.status(400).send('用户名或密码错误');

        const user = results[0];
        if (await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({ username: user.username }, secretKey, { expiresIn: '1h' });
            res.json({ token });
        } else {
            res.status(400).send('用户名或密码错误');
        }
    });
});

// 获取用户信息
app.get('/api/get-user-info', authenticateJWT, (req, res) => {
    const username = req.user.username;

    db.query('SELECT username, email, avatar_url FROM users WHERE username = ?', [username], (err, results) => {
        if (err) {
            console.error('获取用户信息失败:', err);
            return res.status(500).json({ error: '获取用户信息失败' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: '用户不存在' });
        }
        res.json(results[0]);
    });
});

// 获取用户地址信息
app.get('/api/get-user-address', authenticateJWT, (req, res) => {
    const username = req.user.username;

    // 查询 addresses 表中的地址信息
    db.query(
        'SELECT name, phone, address FROM addresses WHERE username = ?',
        [username],
        (err, results) => {
            if (err) {
                console.error('查询地址信息失败:', err);
                return res.status(500).json({ error: '获取地址失败' });
            }
            // 如果没有找到地址，返回 null
            if (results.length === 0) {
                return res.json(null);
            }
            // 返回第一个地址
            res.json(results[0]);
        }
    );
});

// 保存用户地址信息
app.post('/api/save-address', authenticateJWT, (req, res) => {
    const { name, phone, address } = req.body;
    const username = req.user.username;

    // 插入或更新 addresses 表中的地址信息
    db.query(
        `INSERT INTO addresses (username, name, phone, address)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), phone = VALUES(phone), address = VALUES(address)`,
        [username, name, phone, address],
        (err) => {
            if (err) {
                console.error('保存地址信息失败:', err);
                return res.status(500).json({ error: '保存失败' });
            }
            // 成功保存
            res.status(200).send('地址信息已成功保存');
        }
    );
});

// 删除用户地址
app.delete('/api/delete-address', authenticateJWT, (req, res) => {
    const username = req.user.username;

    db.query('DELETE FROM addresses WHERE username = ?', [username], (err) => {
        if (err) {
            console.error('删除地址失败:', err);
            return res.status(500).json({ error: '删除地址失败' });
        }
        res.json({ message: '地址删除成功' });
    });
});

// ================= 产品管理 =================

// 获取所有产品
app.get('/api/products', (req, res) => {
    db.query('SELECT * FROM products', (err, results) => {
        if (err) return res.status(500).send('数据库错误');
        res.json(results);
    });
});

// 获取单个产品详情
app.get('/api/products/:id', (req, res) => {
    const productId = req.params.id;

    db.query('SELECT * FROM products WHERE id = ?', [productId], (err, results) => {
        if (err) return res.status(500).send('数据库错误');
        if (results.length === 0) return res.status(404).send('产品未找到');
        res.json(results[0]);
    });
});

// 搜索产品接口
app.get('/api/search', (req, res) => {
    const query = req.query.q;
    db.query(
        'SELECT * FROM products WHERE name LIKE ? OR description LIKE ?', 
        [`%${query}%`, `%${query}%`],
        (err, results) => {
            if (err) return res.status(500).send('数据库错误');
            res.json(results);
        }
    );
});

// 添加获取分类产品的API
app.get('/api/products/category/:category', (req, res) => {
    const category = req.params.category;
    
    db.query('SELECT * FROM products WHERE category = ?', [category], (err, results) => {
        if (err) return res.status(500).send('数据库错误');
        res.json(results);
    });
});

// ================= 静态页面服务 =================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'webtest.html'));
});

// 在服务器启动时确保上传目录存在
const publicDir = path.join(__dirname, 'public');
const uploadsDir = path.join(publicDir, 'uploads');
const avatarsDir = path.join(uploadsDir, 'avatars');

[publicDir, uploadsDir, avatarsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// 启动服务器
app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
});

app.post('/api/change-password', authenticateJWT, async (req, res) => {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    const username = req.user.username;

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: '新密码和确认密码不匹配' });
    }

    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err) return res.status(500).json({ error: '数据库错误' });
        if (results.length === 0) return res.status(404).json({ error: '用户未找到' });

        const user = results[0];
        const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isOldPasswordValid) return res.status(400).json({ error: '旧密码错误' });

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        db.query('UPDATE users SET password = ? WHERE username = ?', [hashedNewPassword, username], (err) => {
            if (err) return res.status(500).json({ error: '密码修改失败' });
            res.status(200).json({ message: '密码修改成功' });
        });
    });
});

app.post('/api/add-review', authenticateJWT, (req, res) => {
    const { product_id, comment } = req.body;
    const username = req.user.username;

    if (!product_id || !comment) {
        return res.status(400).json({ error: '评论内容和商品ID不能为空' });
    }

    const sql = 'INSERT INTO reviews (product_id, username, comment) VALUES (?, ?, ?)';
    db.query(sql, [product_id, username, comment], (err) => {
        if (err) {
            console.error('评论插入失败:', err);
            return res.status(500).json({ error: '评论保存失败' });
        }
        res.status(201).json({ message: '评论成功保存' });
    });
});

app.get('/api/get-reviews/:product_id', (req, res) => {
    const productId = req.params.product_id;

    const sql = 'SELECT username, comment, comment_date FROM reviews WHERE product_id = ? ORDER BY comment_date DESC';
    db.query(sql, [productId], (err, results) => {
        if (err) {
            console.error('查询评论失败:', err);
            return res.status(500).json({ error: '无法获取评论' });
        }
        res.json(results);
    });
});

// 添加订单的 API
app.post('/api/add-order', authenticateJWT, (req, res) => {
    const { product_id, product_name, product_price, product_image, order_date } = req.body;
    const username = req.user.username;

    console.log('收到订单请求:', {
        username,
        product_id,
        product_name,
        product_price,
        product_image,
        order_date
    });

    // 验证必填字段
    if (!product_id || !product_name || !product_price || !product_image || !order_date) {
        console.log('缺少必填字段:', { product_id, product_name, product_price, product_image, order_date });
        return res.status(400).json({ error: '缺少必填字段' });
    }

    const sql = `
        INSERT INTO orders (
            username, 
            product_id, 
            product_name, 
            product_price, 
            product_image, 
            order_date,
            reviewed
        ) VALUES (?, ?, ?, ?, ?, STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), 0)
    `;

    const values = [
        username,
        parseInt(product_id),
        product_name,
        parseFloat(product_price),
        product_image,
        order_date
    ];

    console.log('执行 SQL:', sql);
    console.log('SQL 参数:', values);

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('订单创建失败，详细错误:', err);
            return res.status(500).json({ 
                error: '订单创建失败',
                details: err.message,
                sqlMessage: err.sqlMessage
            });
        }
        console.log('订单创建成功:', result);
        res.json({ 
            message: '订单创建成功',
            orderId: result.insertId
        });
    });
});

// 生成验证码
app.get('/api/captcha', (req, res) => {
    const captcha = svgCaptcha.create({
        size: 4,  // 验证码长度
        noise: 2, // 干扰线条数
        color: true,
        background: '#f0f0f0'
    });
    
    // 将验证码存入 session
    req.session.captcha = captcha.text.toLowerCase();
    
    res.type('svg');
    res.status(200).send(captcha.data);
});

// 验证验证码
app.post('/api/verify-captcha', (req, res) => {
    const { captcha } = req.body;
    
    if (!captcha || !req.session.captcha) {
        return res.status(400).json({ error: '验证码已过期' });
    }
    
    if (captcha.toLowerCase() === req.session.captcha) {
        delete req.session.captcha; // 验证成功后删除session中的验证码
        res.json({ valid: true });
    } else {
        res.status(400).json({ error: '验证码错误' });
    }
});

// 添加到购物车
app.post('/api/cart/add', authenticateJWT, (req, res) => {
    const { product_id, quantity } = req.body;
    const username = req.user.username;
    
    const sql = `
        INSERT INTO cart (username, product_id, quantity)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
    `;
    
    db.query(sql, [username, product_id, quantity], (err) => {
        if (err) {
            console.error('添加到购物车失败:', err);
            return res.status(500).json({ error: '添加到购物车失败' });
        }
        res.json({ message: '成功添加到购物车' });
    });
});

// 获取购物车列表
app.get('/api/cart', authenticateJWT, (req, res) => {
    const username = req.user.username;
    
    const sql = `
        SELECT c.*, p.name, p.price, p.image
        FROM cart c
        JOIN products p ON c.product_id = p.id
        WHERE c.username = ?
        ORDER BY c.created_at DESC
    `;
    
    db.query(sql, [username], (err, results) => {
        if (err) {
            console.error('获取购物车失败:', err);
            return res.status(500).json({ error: '获取购物车失败' });
        }
        res.json(results);
    });
});

// 更新购物车商品数量
app.put('/api/cart/update', authenticateJWT, (req, res) => {
    const { product_id, quantity } = req.body;
    const username = req.user.username;
    
    const sql = `
        UPDATE cart 
        SET quantity = ?
        WHERE username = ? AND product_id = ?
    `;
    
    db.query(sql, [quantity, username, product_id], (err) => {
        if (err) {
            console.error('更新购物车失败:', err);
            return res.status(500).json({ error: '更新购物车失败' });
        }
        res.json({ message: '购物车已更新' });
    });
});

// 删除购物车商品
app.delete('/api/cart/remove', authenticateJWT, (req, res) => {
    const { product_id } = req.body;
    const username = req.user.username;
    
    if (!product_id) {
        return res.status(400).json({ error: '无效的商品ID' });
    }

    const sql = `
        DELETE FROM cart 
        WHERE username = ? AND product_id = ?
    `;
    
    db.query(sql, [username, product_id], (err) => {
        if (err) {
            console.error('删除购物车商品失败:', err);
            return res.status(500).json({ error: '删除购物车商品失败' });
        }
        res.json({ message: '商品已从购物车移除' });
    });
});

// 上传头像接口
app.post('/api/upload-avatar', authenticateJWT, upload.single('avatar'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: '没有上传文件' });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const username = req.user.username;

    // 先检查用户是否存在并获取旧头像
    db.query('SELECT avatar_url FROM users WHERE username = ?', [username], (err, results) => {
        if (err) {
            console.error('查询用户失败:', err);
            return res.status(500).json({ error: '服务器错误' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: '用户不存在' });
        }

        // 如果存在旧头像，删除它
        const oldAvatarUrl = results[0].avatar_url;
        if (oldAvatarUrl) {
            const oldAvatarPath = path.join(__dirname, 'public', oldAvatarUrl.replace(/^\//, ''));
            if (fs.existsSync(oldAvatarPath)) {
                fs.unlinkSync(oldAvatarPath);
            }
        }

        // 更新用户头像
        db.query('UPDATE users SET avatar_url = ? WHERE username = ?', [avatarUrl, username], (err) => {
            if (err) {
                console.error('更新头像URL失败:', err);
                return res.status(500).json({ error: '保存头像失败' });
            }
            res.json({ avatarUrl });
        });
    });
});

// 获取用户订单历史
app.get('/api/order-history', authenticateJWT, (req, res) => {
    const username = req.user.username;
    
    const sql = `
        SELECT * FROM orders 
        WHERE username = ?
        ORDER BY order_date DESC
    `;
    
    db.query(sql, [username], (err, results) => {
        if (err) {
            console.error('获取订单历史失败:', err);
            return res.status(500).json({ error: '获取订单历史失败' });
        }
        res.json(results);
    });
});

// 清空用户订单历史
app.delete('/api/orders/clear', authenticateJWT, (req, res) => {
    const username = req.user.username;
    
    const sql = `
        DELETE FROM orders 
        WHERE username = ?
    `;
    
    db.query(sql, [username], (err) => {
        if (err) {
            console.error('清空订单历史失败:', err);
            return res.status(500).json({ error: '清空订单历史失败' });
        }
        res.json({ message: '订单历史已清空' });
    });
});

// 创建订单
app.post('/api/create-order', authenticateJWT, (req, res) => {
    const username = req.user.username;
    const { product_id, product_name, product_price, product_image, order_date } = req.body;

    const sql = `
        INSERT INTO orders (username, product_id, product_name, product_price, product_image, order_date)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    const values = [
        username,
        product_id,
        product_name,
        product_price,
        product_image,
        order_date
    ];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('订单创建失败:', err);
            return res.status(500).json({ error: '订单创建失败' });
        }
        res.json({ 
            message: '订单创建成功',
            orderId: result.insertId
        });
    });
});


