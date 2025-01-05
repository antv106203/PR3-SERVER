const dbConnect = require("../db/dbConnect");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


// Hàm kiểm tra tài khoản và mật khẩu, trả về token nếu thành công
async function login(username, password) {
    // 1. Kiểm tra chuỗi rỗng
    if (!username || !password) {
        throw new Error('Username and password cannot be empty'); // Báo lỗi nếu thiếu thông tin
    }

    // 2. Kiểm tra tài khoản có tồn tại không
    const [rows] = await dbConnect.query('SELECT * FROM account WHERE username = ?', [username]);
    if (rows.length === 0) {
        throw new Error('Account not found');
    }

    const user = rows[0];

    console.log(password)

    // 3. Kiểm tra mật khẩu
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        throw new Error('Incorrect password');
    }

    // 4. Tạo token
    const token = jwt.sign(
        { id: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    return {
        message: "Login Successful",
        userData: { username: user.username, id: user.id },
        token
    };
}

// Kiểm tra điều kiện tài khoản và mật khẩu
function validateUsername(username) {
    return username.length >= 6; // Username must be more than 6 characters
}
  
function validatePassword(password) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
    // Check if password contains at least one uppercase letter, one lowercase letter, one digit, and has a minimum length of 6 characters
    return regex.test(password);
}
  
async function register(username, password) {
    // Kiểm tra điều kiện tài khoản và mật khẩu
    if (!validateUsername(username)) {
        throw new Error('Username must be more than 6 characters');
    }

    if (!validatePassword(password)) {
        throw new Error('Password must contain at least one uppercase letter, one lowercase letter, one digit, and be at least 6 characters long');
    }

    // Kiểm tra xem tài khoản đã tồn tại chưa
    const [rows] = await dbConnect.query('SELECT * FROM account WHERE username = ?', [username]);

    if (rows.length > 0) {
        throw new Error('Username already exists');
    }

    // Mã hóa mật khẩu trước khi lưu vào cơ sở dữ liệu
    const hashedPassword = await bcrypt.hash(password, 10); // bcrypt.hash(password, saltRounds)

    // Thêm người dùng mới vào cơ sở dữ liệu với mật khẩu đã mã hóa
    const query = 'INSERT INTO account (username, password) VALUES (?, ?)';
    await dbConnect.query(query, [username, hashedPassword]);

    return { message: 'Register successful!' };
}
  
module.exports = { login, register };