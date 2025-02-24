document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('productId');

    if (productId) {
        fetch(`/api/products/${productId}`)
        .then(response => response.json())
        .then(product => {
            displayProductDetails(product);
            updateBrowsingHistory(product);
            localStorage.setItem('lastProductId', productId);

            document.getElementById('buy-button').onclick = function() {
                const token = localStorage.getItem('token');
                if (!token) {
                    alert('请先登录！');
                    window.location.href = 'login.html';
                } else {
                    const productName = encodeURIComponent(product.name);
                    const productPrice = product.price;
                    const productImage = product.image;

                    window.location.href = `pay.html?productId=${productId}&productName=${productName}&productPrice=${productPrice}&productImage=${productImage}`;
                }
            };

            document.getElementById('view-reviews').onclick = function() {
                window.location.href = `review-display.html?productId=${productId}`;
            };

            document.getElementById('add-to-cart').onclick = function() {
                const token = localStorage.getItem('token');
                if (!token) {
                    alert('请先登录！');
                    window.location.href = 'login.html';
                    return;
                }

                fetch('/api/cart/add', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        product_id: productId,
                        quantity: 1
                    })
                })
                .then(response => {
                    if (!response.ok) throw new Error('添加失败');
                    if (confirm('成功添加到购物车！是否立即查看购物车？')) {
                        window.location.href = 'cart.html';
                    }
                })
                .catch(error => {
                    console.error('添加到购物车失败:', error);
                    alert('添加失败，请稍后重试');
                });
            };
        })
        .catch(error => console.error('获取产品详情时出错:', error));
    }

    function displayProductDetails(product) {
        document.getElementById('product-name').textContent = product.name;
        document.getElementById('product-price').textContent = `价格: ¥${product.price}`;
        document.getElementById('product-description').textContent = product.description;
        document.getElementById('product-image').src = product.image;
    }

    function updateBrowsingHistory(product) {
        let browsingHistory = JSON.parse(localStorage.getItem('browsingHistory')) || [];
        const now = new Date().toISOString(); // 使用 ISO 8601 时间格式

        const productView = {
            name: product.name,
            price: product.price,
            image: product.image,
            viewTime: now
        };

        browsingHistory.push(productView);
        localStorage.setItem('browsingHistory', JSON.stringify(browsingHistory));
    }
});
