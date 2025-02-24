document.addEventListener('DOMContentLoaded', function() {
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    
    function loadCart() {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        fetch('/api/cart', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(items => {
            if (items.length === 0) {
                cartItems.innerHTML = '<div class="empty-cart">购物车是空的</div>';
                cartTotal.style.display = 'none';
                checkoutBtn.style.display = 'none';
                return;
            }

            let total = 0;
            cartItems.innerHTML = items.map(item => {
                total += item.price * item.quantity;
                return `
                    <div class="cart-item" data-id="${item.product_id}">
                        <img src="${item.image}" alt="${item.name}">
                        <div class="item-info">
                            <h3>${item.name}</h3>
                            <p class="price">¥${item.price}</p>
                            <div class="quantity-control">
                                <button onclick="updateQuantity(${item.product_id}, ${item.quantity - 1})">-</button>
                                <span>${item.quantity}</span>
                                <button onclick="updateQuantity(${item.product_id}, ${item.quantity + 1})">+</button>
                            </div>
                        </div>
                        <button class="remove-btn" onclick="removeItem(${item.product_id})">删除</button>
                    </div>
                `;
            }).join('');

            cartTotal.style.display = 'block';
            cartTotal.textContent = `总计: ¥${total.toFixed(2)}`;
            checkoutBtn.style.display = 'block';
        })
        .catch(error => {
            console.error('获取购物车失败:', error);
            alert('获取购物车失败，请稍后重试');
        });
    }

    window.updateQuantity = function(productId, newQuantity) {
        if (newQuantity < 1) return;

        const token = localStorage.getItem('token');
        fetch('/api/cart/update', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                product_id: productId,
                quantity: newQuantity
            })
        })
        .then(response => {
            if (!response.ok) throw new Error('更新失败');
            loadCart();
        })
        .catch(error => {
            console.error('更新数量失败:', error);
            alert('更新数量失败，请稍后重试');
        });
    };

    window.removeItem = function(productId) {
        if (!confirm('确定要删除这个商品吗？')) return;

        const token = localStorage.getItem('token');
        fetch('/api/cart/remove', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ product_id: parseInt(productId) })
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(text || '删除失败');
                });
            }
            loadCart();
        })
        .catch(error => {
            console.error('删除商品失败:', error);
            alert('删除商品失败，请稍后重试: ' + error.message);
        });
    };

    checkoutBtn.onclick = function() {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        // 获取购物车中的商品信息
        const cartItems = document.getElementById('cart-items').getElementsByClassName('cart-item');
        if (cartItems.length === 0) {
            alert('购物车是空的');
            return;
        }
        
        // 获取所有商品的ID和总价
        let totalPrice = 0;
        const productIds = Array.from(cartItems).map(item => {
            const price = parseFloat(item.getElementsByClassName('price')[0].textContent.replace('¥', ''));
            const quantity = parseInt(item.getElementsByClassName('quantity-control')[0].getElementsByTagName('span')[0].textContent);
            totalPrice += price * quantity;
            return parseInt(item.getAttribute('data-id'));
        });
        
        // 获取第一个商品的信息用于支付页面
        const firstItem = cartItems[0];
        const productName = firstItem.getElementsByTagName('h3')[0].textContent;
        const productPrice = totalPrice.toFixed(2);
        const productImage = firstItem.getElementsByTagName('img')[0].src;
        const productId = firstItem.getAttribute('data-id');

        // 删除所有已结算的商品
        function deleteNextItem(index) {
            if (index >= productIds.length) {
                // 构建支付页面的 URL并跳转
                const payUrl = `pay.html?productName=${encodeURIComponent(productName)}&productPrice=${productPrice}&productImage=${encodeURIComponent(productImage)}&itemCount=${productIds.length}&productId=${productId}`;
                window.location.href = payUrl;
                return;
            }

            fetch('/api/cart/remove', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ product_id: productIds[index] })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('删除失败');
                }
                // 删除下一个商品
                deleteNextItem(index + 1);
            })
            .catch(error => {
                console.error('删除商品失败:', error);
                alert('结算失败，请稍后重试');
            });
        }

        // 开始删除第一个商品
        deleteNextItem(0);
    };

    // 初始加载购物车
    loadCart();
}); 