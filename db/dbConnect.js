const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConnect = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT
});


async function checkConnection() {
    try {
        const connection = await dbConnect.getConnection();
        console.log("Kết nối MySQL thành công!");
        await connection.release();
    } catch (err) {
        console.error("Lỗi khi kết nối MySQL: ", err);
    }
}

checkConnection();

module.exports = dbConnect;