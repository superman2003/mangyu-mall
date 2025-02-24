document.addEventListener('DOMContentLoaded', function () {
    const list = document.getElementById('pending-reviews');

    function fetchPendingReviews() {
        console.log('正在获取待评价列表...');
        const orderHistory = JSON.parse(localStorage.getItem('orderHistory')) || [];
        const pendingReviews = orderHistory.filter(order => !order.reviewed);
        console.log('待评价列表:', pendingReviews);

        list.innerHTML = '';

        if (pendingReviews.length === 0) {
            list.innerHTML = '<li>暂无待评价商品</li>';
            return;
        }

        pendingReviews.forEach(item => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <img src="${item.productImage}" alt="${item.productName}">
                <div>
                    <h3>${item.productName}</h3>
                    <p>价格: ¥${item.productPrice}</p>
                    <button class="btn btn-primary" onclick="submitReview('${item.productId}')">评价</button>
                </div>
            `;
            list.appendChild(listItem);
        });
    }

    window.submitReview = function (productId) {
        location.href = `submit-review.html?productId=${productId}`;
    };

    fetchPendingReviews();
});
