const dbConnect = require("../db/dbConnect")

/**
 * Thêm một bản ghi truy cập vào bảng access_logs.
 * @param {number} userId - ID của người dùng.
 * @param {string} accessResult - Kết quả truy cập.
 * @param {string} eventType - Loại sự kiện.
 * @returns {Promise<object>} - Trả về một đối tượng chứa thông tin bản ghi vừa thêm.
 */
async function createAccessLog(data) {
    const connection = await dbConnect.getConnection(); // Lấy kết nối từ pool
    try {
        // Truy vấn tìm user_id từ fingerprint_id
        const findUserQuery = `
            SELECT user_id FROM fingerprints WHERE fingerprint_id = ?`;
        const [rows] = await connection.query(findUserQuery, [data.fingerId]);

        let userId = null; // Mặc định là null nếu không tìm thấy user

        if (rows.length > 0) {
            userId = rows[0].user_id; // Gán user_id nếu tìm thấy
        }

        // Thêm bản ghi vào bảng access_logs
        const insertLogQuery = `
            INSERT INTO access_logs (user_id, access_result, event_type)
            VALUES (?, ?, ?)`;

        const [result] = await connection.query(insertLogQuery, [userId, data.accessResult, data.eventType]);

        // Trả về thông tin bản ghi đã thêm
        return {
            log_id: result.insertId,
        };
    } catch (error) {
        console.error('Error in AccessLogService.createAccessLog:', error);
        throw error; // Ném lỗi ra ngoài để xử lý tiếp
    } finally {
        await connection.release(); // Đảm bảo giải phóng kết nối
    }
}


/**
 * Lấy thông tin bản ghi truy cập theo log_id.
 * @param {number} logId - ID của bản ghi truy cập.
 * @returns {Promise<object|null>} - Thông tin bản ghi truy cập nếu tìm thấy, ngược lại trả về null.
 */
async function getAccessLog(logId) {
    const connection = await dbConnect.getConnection(); // Lấy kết nối từ pool
    try {
        // Kiểm tra logId không phải là null
        if (logId != null) {
            const query = 'SELECT * FROM access_logs WHERE log_id = ?';
            const [rows] = await connection.query(query, [logId]);

            // Kiểm tra xem có bản ghi nào được tìm thấy không
            if (rows.length > 0) {
                return rows[0]; // Trả về đối tượng bản ghi truy cập
            } else {
                return null; // Trả về null nếu không tìm thấy bản ghi
            }
        } else {
            return null; // Trả về null nếu logId là null
        }
    } catch (error) {
        console.error('Error in getAccessLog:', error);
        throw error; // Ném lỗi ra ngoài để xử lý tiếp
    } finally {
        await connection.release(); // Đảm bảo giải phóng kết nối
    }
}

/**
* Lấy tất cả các bản ghi truy cập với phân trang, sắp xếp theo access_time,
* và hỗ trợ tìm kiếm theo user_id và lọc theo access_result.
* @param {number} page - Số trang cần lấy (mặc định là 1).
* @param {number} limit - Số bản ghi mỗi trang (mặc định là 10).
* @param {string} sortOrder - Thứ tự sắp xếp (asc hoặc desc, mặc định là 'desc').
* @param {number} [userId] - user_id cần tìm kiếm (tùy chọn).
* @param {string} [accessResult] - Bộ lọc theo access_result (tùy chọn).
* @returns {Promise<object>} - Danh sách các bản ghi truy cập, tổng số bản ghi và thông tin phân trang.
*/

async function getAllAccessLogs(data) {
    const { page = 1, limit = 10, userId = null, accessResult = null, sortOrder = 'desc' } = data;
    const connection = await dbConnect.getConnection(); // Lấy kết nối từ pool
    try {
        // Chuyển page và limit thành số nguyên
        const pageInt = parseInt(page, 10);
        const limitInt = parseInt(limit, 10);

        // Kiểm tra page và limit hợp lệ
        if (isNaN(pageInt) || isNaN(limitInt) || pageInt <= 0 || limitInt <= 0) {
            throw new Error('Invalid page or limit');
        }

        // Tính toán OFFSET
        const offset = (pageInt - 1) * limitInt;

        // Kiểm tra sortOrder hợp lệ (chỉ có thể là 'asc' hoặc 'desc')
        const validSortOrders = ['ASC', 'DESC'];
        const order = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

        // Xây dựng điều kiện lọc cho câu truy vấn lấy dữ liệu
        let query = 'SELECT SQL_CALC_FOUND_ROWS * FROM access_logs WHERE 1=1';
        let queryParams = [];

        // Lọc theo userId nếu có
        if (userId !== null && userId !== "") {
            query += ' AND user_id = ?';
            queryParams.push(userId);  // Lọc theo userId
        }

        // Lọc theo access_result nếu có
        if (accessResult) {
            query += ' AND access_result = ?';
            queryParams.push(accessResult);  // Lọc theo access_result
        }

        // Truy vấn lấy dữ liệu với phân trang, lọc và sắp xếp
        query += ` ORDER BY access_time ${order} LIMIT ? OFFSET ?`;
        queryParams.push(limitInt, offset);
        const [logs] = await connection.query(query, queryParams);

        // Truy vấn lấy tổng số bản ghi (sử dụng SQL_CALC_FOUND_ROWS)
        const [[{ total }]] = await connection.query('SELECT FOUND_ROWS() AS total');

        // Tính toán tổng số trang
        const totalPages = Math.ceil(total / limitInt);

        // Trả về dữ liệu theo định dạng yêu cầu
        return {
            total,        // Tổng số bản ghi
            totalPages,   // Tổng số trang
            page: pageInt, // Số trang hiện tại
            limit: limitInt, // Số bản ghi mỗi trang
            listAccess: logs   // Danh sách các bản ghi truy cập
        };
    } catch (error) {
        console.error('Error in getAllAccessLogs:', error);
        throw error; // Ném lỗi ra ngoài để xử lý tiếp
    } finally {
        await connection.release(); // Đảm bảo giải phóng kết nối
    }
}












module.exports = { createAccessLog ,getAccessLog, getAllAccessLogs};