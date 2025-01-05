const dbConnect = require("../db/dbConnect");

/**
 * Thêm người dùng mới vào cơ sở dữ liệu.
 * @param {Object} user - Đối tượng người dùng chứa thông tin cần thiết.
 * @returns {Promise<number>} - ID của người dùng vừa thêm.
 */
async function createUser(user) {
    const connection = await dbConnect.getConnection(); // Lấy kết nối từ pool
    try {
        // Kiểm tra các trường không được null
        if (
            user.userId == null ||
            user.fullName == null ||
            user.age == null ||
            user.email == null ||
            user.phoneNumber == null ||
            user.address == null
        ) {
            console.log("One or more user fields are null");
            return { success: false, error: "One or more user fields are null" };
        }

        await connection.beginTransaction(); // Bắt đầu transaction

        // Thêm user vào bảng users
        const userQuery = `
            INSERT INTO users (user_id, fullname, age, email, phone_number, address)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        try {
            const [userResult] = await connection.query(userQuery, [
                user.userId,
                user.fullName,
                user.age,
                user.email,
                user.phoneNumber,
                user.address
            ]);
            await connection.commit(); // Xác nhận transaction
            console.log('User added successfully without fingerprints for user_id:', user.userId);

            return { success: true, userId: user.userId }; // Trả về user_id nếu thành công

        } catch (error) {
            await connection.rollback(); // Rollback nếu có lỗi

            // Kiểm tra lỗi trùng user_id
            if (error.code === 'ER_DUP_ENTRY') {
                console.error('User ID already exists:', error);
                return { success: false, error: "User ID already exists" };
            }

            // Các lỗi khác (ví dụ: lỗi cơ sở dữ liệu)
            console.error('Error in creating user:', error);
            return { success: false, error: error.message };
        }

    } catch (error) {
        console.error('Error in createUser:', error);
        return { success: false, error: "Unexpected error occurred" };
    } finally {
        await connection.release(); // Đảm bảo giải phóng kết nối
    }
}

/**
 * Lấy thông tin người dùng theo user_id.
 * @param {number} userId - ID của người dùng.
 * @returns {Promise<object|null>} - Thông tin người dùng nếu tìm thấy, ngược lại trả về null.
 */
async function getUserByUserId(userId) {
    const connection = await dbConnect.getConnection(); // Lấy kết nối từ pool
    try {
        if (userId != null) {
            // Truy vấn thông tin người dùng
            const userQuery = `
                SELECT * FROM users
                WHERE user_id = ?
            `;
            const [userRows] = await connection.query(userQuery, [userId]);

            if (userRows.length === 0) {
                console.log('No user found with user_id:', userId);
                return null; // Không tìm thấy người dùng
            }

            const user = userRows[0]; // Thông tin người dùng

            // Truy vấn danh sách fingerprints
            const fingerprintQuery = `
                SELECT * FROM fingerprints
                WHERE user_id = ?
            `;
            const [fingerprintRows] = await connection.query(fingerprintQuery, [userId]);

            // Xử lý danh sách fingerprints
            const fingerprints = fingerprintRows.map(row => ({
                fingerprint_id: row.fingerprint_id,
                fingerprint_name: row.fingerprint_name,
                status: row.status,
                valid_until: row.valid_until,
                created_at: row.created_at,
            }));

            // Thêm danh sách fingerprints vào đối tượng người dùng
            user.fingerprints = fingerprints;

            return user; // Trả về đối tượng người dùng
        } else {
            console.log('userId is null');
            return null;
        }
    } catch (error) {
        console.error('Error in getUserByUserId:', error);
        throw error;
    } finally {
        await connection.release();
    }
}

/**
 * Lấy thông tin người dùng với phân trang, sắp xếp và lọc.
 * @param {Object} options - Các tùy chọn truy vấn.
 * @param {number} options.page - Số trang (mặc định là 1).
 * @param {number} options.limit - Số lượng người dùng mỗi trang (mặc định là 10).
 * @param {string} options.keyword - Từ khóa tìm kiếm áp dụng cho fullname, email, và phone_number.
 * @param {string} [options.sortOrder='DESC'] - Thứ tự sắp xếp, mặc định là giảm dần. Có thể là 'ASC' hoặc 'DESC'.
 * @returns {Promise<Object>} - Kết quả bao gồm tổng số bản ghi, tổng số trang, trang hiện tại, số bản ghi mỗi trang và danh sách người dùng.
 */
async function getAllUsers(data) {
    const { page = 1, limit = 10, keyword = '', sortOrder = 'DESC' } = data;
    const connection = await dbConnect.getConnection(); // Lấy kết nối từ pool
    try {
        const pageInt = parseInt(page, 10);
        const limitInt = parseInt(limit, 10);

        // Kiểm tra giá trị page và limit có hợp lệ không
        if (isNaN(pageInt) || isNaN(limitInt) || pageInt <= 0 || limitInt <= 0) {
            throw new Error('Invalid page or limit'); // Ném lỗi nếu không hợp lệ
        }

        const offset = (pageInt - 1) * limitInt; // Tính toán offset

        // Đảm bảo sortOrder chỉ có thể là 'ASC' hoặc 'DESC' để tránh lỗi SQL Injection
        const validSortOrders = ['ASC', 'DESC'];
        const order = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

        // Xây dựng điều kiện tìm kiếm dựa trên keyword
        const searchQuery = `%${keyword}%`;
        const whereClause = keyword
            ? `WHERE u.fullname LIKE ? OR u.email LIKE ? OR u.phone_number LIKE ?`
            : '';

        // Truy vấn đếm tổng số bản ghi
        const countQuery = `
            SELECT COUNT(*) AS total
            FROM users u
            ${whereClause};
        `;
        const countParams = keyword ? [searchQuery, searchQuery, searchQuery] : [];
        const [[{ total }]] = await connection.query(countQuery, countParams);

        // Tính toán tổng số trang
        const totalPages = Math.ceil(total / limitInt);

        // Truy vấn lấy dữ liệu người dùng với điều kiện lọc, sắp xếp và phân trang
        const query = `
            SELECT 
                u.user_id, 
                u.fullname, 
                u.email, 
                u.phone_number, 
                u.created_at, 
                u.status_user,
                COUNT(f.fingerprint_id) AS total_fingerprints
            FROM users u
            LEFT JOIN fingerprints f ON u.user_id = f.user_id
            ${whereClause}
            GROUP BY u.user_id
            ORDER BY u.created_at ${order}
            LIMIT ? OFFSET ?;
        `;

        const queryParams = keyword
            ? [searchQuery, searchQuery, searchQuery, limitInt, offset]
            : [limitInt, offset];
        const [rows] = await connection.query(query, queryParams);

        // Trả về dữ liệu theo định dạng yêu cầu
        return {
            total,             // Tổng số bản ghi
            totalPages,        // Tổng số trang
            page: pageInt,     // Số trang hiện tại
            pageSize: limitInt, // Số bản ghi mỗi trang
            listUsers: rows    // Danh sách thông tin người dùng
        };
    } catch (error) {
        console.error('Error in getAllUsers:', error);
        throw error; // Ném lỗi ra ngoài để xử lý tiếp
    } finally {
        await connection.release(); // Đảm bảo giải phóng kết nối
    }
}






/**
 * Cập nhật thông tin người dùng.
 * @param {number} userId - ID của người dùng cần cập nhật.
 * @param {Object} userData - Dữ liệu người dùng mới.
 * @returns {Promise<Object>} - Trả về một đối tượng chứa trạng thái và thông điệp.
 */
async function updateUser(userData) {
    const connection = await dbConnect.getConnection(); // Lấy kết nối từ pool
    try {
        // Kiểm tra userId và userData không phải là null
        if (userData) {
            const query = `
                UPDATE users 
                SET fullname = ?, age = ?, email = ?, phone_number = ?, address = ?
                WHERE user_id = ?`;
            
            const [result] = await connection.query(query, [
                userData.fullName,
                userData.age,
                userData.email,
                userData.phoneNumber,
                userData.address,
                userData.userId
            ]);

            if (result.affectedRows > 0) {
                console.log('User updated successfully.');
                return { status: true, message: 'Thông tin người dùng đã được cập nhật thành công.' };
            } else {
                console.log('No user found with user_id:', userId);
                return { status: false, message: 'Người dùng không tồn tại hoặc không được cập nhật.' };
            }
        } else {
            console.log('Invalid userId or userData.');
            return { status: false, message: 'ID người dùng hoặc dữ liệu không hợp lệ.' };
        }
    } catch (error) {
        console.error('Error in updateUser:', error);
        throw error; // Ném lỗi ra ngoài để xử lý tiếp
    } finally {
        await connection.release(); // Giải phóng kết nối
    }
}

/**
 * Xóa người dùng bằng cách cập nhật trạng thái thành 'deleted'.
 * @param {number} user_id - ID của người dùng cần xóa.
 * @returns {Promise<Object>} - Trả về một đối tượng JSON chứa trạng thái và thông điệp.
 */
async function deleteUser(user_id) {
    const connection = await dbConnect.getConnection();
    try {
        const query = 'UPDATE users SET status_user = ? WHERE user_id = ?';
        const [result] = await connection.query(query, ['deleted', user_id]);

        // Kiểm tra xem có hàng nào được cập nhật không
        if (result.affectedRows === 0) {
            console.log(`Người dùng có user_id ${user_id} không tồn tại hoặc đã bị đánh dấu là đã xóa.`);
            return { status: false, message: 'Người dùng không tồn tại hoặc đã bị đánh dấu là đã xóa.' };
        } else {
            console.log(`Người dùng có user_id ${user_id} đã được đánh dấu là đã xóa.`);
            return { status: true, message: 'Người dùng đã được đánh dấu là đã xóa thành công.' };
        }
    } catch (error) {
        console.error('Lỗi trong deleteUser:', error);
        throw error; // Ném lỗi ra ngoài để xử lý tiếp
    } finally {
        await connection.release(); // Giải phóng kết nối
    }
}





module.exports = {
    createUser,
    getUserByUserId,
    updateUser,
    deleteUser,
    getAllUsers
};