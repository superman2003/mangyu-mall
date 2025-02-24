document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('productId');

    if (!productId) {
        alert('未指定商品ID');
        return;
    }

    loadReviews(productId);

    function loadReviews(productId) {
        fetch(`/api/get-reviews/${productId}`)
            .then(response => response.json())
            .then(reviews => {
                const reviewList = document.getElementById('review-list');
                reviewList.innerHTML = '';

                if (reviews.length === 0) {
                    reviewList.innerHTML = '<p>暂无评论</p>';
                    return;
                }

                reviews.forEach(review => {
                    const reviewItem = document.createElement('div');
                    reviewItem.className = 'review-item';
                    reviewItem.innerHTML = `
                        <p><strong>${review.username}</strong>: ${review.comment}</p>
                        <small>评论时间: ${new Date(review.comment_date).toLocaleString()}</small>
                    `;
                    reviewList.appendChild(reviewItem);
                });
            })
            .catch(err => {
                console.error('加载评论失败:', err);
                alert('无法加载评论，请稍后重试！');
            });
    }
});
