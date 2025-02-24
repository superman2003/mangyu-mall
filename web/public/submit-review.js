document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('productId');
    const reviewForm = document.getElementById('review-form');

    if (!productId) {
        alert('未指定商品ID');
        window.history.back();
        return;
    }

    reviewForm.addEventListener('submit', function (event) {
        event.preventDefault();

        const comment = document.getElementById('comment').value;
        const token = localStorage.getItem('token');

        if (!token) {
            alert('请先登录再提交评论！');
            window.location.href = 'login.html';
            return;
        }

        // 添加加载状态
        const submitBtn = document.querySelector('.btn-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = '提交中...';

        fetch('/api/add-review', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                product_id: productId,
                comment: comment
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('评论提交失败');
            }
            return response.json();
        })
        .then(data => {
            alert('评论提交成功！');
            
            // 更新订单的评论状态
            let orderHistory = JSON.parse(localStorage.getItem('orderHistory')) || [];
            orderHistory = orderHistory.map(order => {
                if (order.productId == productId) {
                    return { ...order, reviewed: true };
                }
                return order;
            });
            localStorage.setItem('orderHistory', JSON.stringify(orderHistory));
            
            // 返回上一页并刷新
            window.location.href = 'pending-reviews.html';
        })
        .catch(error => {
            console.error('提交评论失败:', error);
            alert('评论提交失败，请稍后重试！');
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = '提交评论';
        });
    });
});
