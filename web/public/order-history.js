document.addEventListener('DOMContentLoaded', function () {
    const ordersPerPage = 3;
    let currentPage = 1;

    function fetchOrdersAndUpdate() {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
        
        // 从服务器获取订单历史
        fetch('api/order-history', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('获取订单失败');
            }
            return response.json();
        })
        .then(orderHistory => {
            // 按时间排序，越新的记录排在前面
            orderHistory.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));

            const list = document.getElementById('order-history');
            const pagination = document.getElementById('pagination');
            list.innerHTML = '';
            pagination.innerHTML = '';

            if (orderHistory.length === 0) {
                list.innerHTML = '<div class="text-center p-4">暂无订单记录</div>';
                return;
            }

            const totalPages = Math.ceil(orderHistory.length / ordersPerPage);
            const start = (currentPage - 1) * ordersPerPage;
            const end = start + ordersPerPage;

            const ordersToDisplay = orderHistory.slice(start, end);
            ordersToDisplay.forEach(item => {
                let formattedDate = '日期无效';
                try {
                    formattedDate = new Date(item.order_date).toLocaleDateString('zh-CN');
                } catch (e) {
                    console.error('日期格式化错误:', e);
                }

                const listItem = document.createElement('div');
                listItem.className = 'order-item';
                listItem.innerHTML = `
                    <img src="${item.product_image}" alt="${item.product_name}">
                    <div class="item-info">
                        <h3>${item.product_name}</h3>
                        <p>价格: ¥${item.product_price}</p>
                        <p>订单日期: ${formattedDate}</p>
                        <button class="btn-review" onclick="submitReview('${item.product_id}')" 
                            ${item.reviewed ? 'disabled' : ''}>
                            ${item.reviewed ? '已评价' : '评价'}
                        </button>
                    </div>
                `;
                list.appendChild(listItem);
            });

            createPagination(totalPages);
        })
        .catch(error => {
            console.error('获取订单历史失败:', error);
            alert('获取订单历史失败，请稍后重试');
        });
    }

    function createPagination(totalPages) {
        const pagination = document.getElementById('pagination');

        const prevButton = document.createElement('button');
        prevButton.innerText = '上一页';
        prevButton.className = 'btn btn-outline-primary';
        prevButton.disabled = currentPage === 1;
        prevButton.onclick = () => {
            if (currentPage > 1) {
                currentPage--;
                fetchOrdersAndUpdate();
            }
        };
        pagination.appendChild(prevButton);

        for (let i = 1; i <= totalPages; i++) {
            const button = document.createElement('button');
            button.innerText = i;
            button.className = `btn ${i === currentPage ? 'btn-primary' : 'btn-outline-primary'}`;
            button.onclick = () => {
                currentPage = i;
                fetchOrdersAndUpdate();
            };
            pagination.appendChild(button);
        }

        const nextButton = document.createElement('button');
        nextButton.innerText = '下一页';
        nextButton.className = 'btn btn-outline-primary';
        nextButton.disabled = currentPage === totalPages;
        nextButton.onclick = () => {
            if (currentPage < totalPages) {
                currentPage++;
                fetchOrdersAndUpdate();
            }
        };
        pagination.appendChild(nextButton);
    }

    // 清空订单记录
    document.getElementById('clear-orders-btn').onclick = function () {
        if (confirm('确认清空所有订单记录吗？')) {
            const token = localStorage.getItem('token');
            fetch('/api/orders/clear', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(response => {
                if (!response.ok) throw new Error('清空失败');
                fetchOrdersAndUpdate();
            })
            .catch(error => {
                console.error('清空订单记录失败:', error);
                alert('清空订单记录失败，请稍后重试');
            });
        }
    };

    // 回到首页按钮
    document.getElementById('home-btn').onclick = function () {
        window.location.href = 'webtest.html?skipTokenClear=true';
    };

    // 评价功能
    window.submitReview = function (productId) {
        window.location.href = `submit-review.html?productId=${productId}`;
    };

    // 初始加载
    fetchOrdersAndUpdate();
});
