# Mangyu Mall API

A Node.js + Express + MySQL based e-commerce backend service.

## Features

- User System (Register, Login, Verification)
- Product Management (List, Details, Search) 
- Shopping Cart
- Order System
- Review System
- Address Management

## Tech Stack

- Express.js - Web Framework
- MySQL - Database
- JWT - Authentication
- Bcrypt - Password Encryption
- Multer - File Upload
- SVG-Captcha - Verification Code

## API Endpoints

### User
- `POST /api/register` - Register new user
- `POST /api/login` - User login
- `GET /api/get-user-info` - Get user info
- `POST /api/change-password` - Change password
- `POST /api/upload-avatar` - Upload avatar

### Product
- `GET /api/products` - Get product list
- `GET /api/products/:id` - Get product details
- `GET /api/search` - Search products

### Cart
- `POST /api/cart/add` - Add to cart
- `GET /api/cart` - View cart
- `PUT /api/cart/update` - Update quantity
- `DELETE /api/cart/remove` - Remove item

### Order
- `POST /api/create-order` - Create order
- `GET /api/order-history` - Order history
- `POST /api/add-review` - Add review

## Project Structure
