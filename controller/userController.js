const userService = require("../service/userService")

/**
 * Tạo người dùng mới.
 * @param {Object} req - Đối tượng yêu cầu từ client.
 * @param {Object} res - Đối tượng phản hồi để gửi dữ liệu trở lại client.
 */
async function createUser(req, res) {
    const { user } = req.body; // Lấy dữ liệu người dùng từ body của yêu cầu

    try {
        // Gọi hàm createUser từ userService (hàm createUser đã được sửa đổi trong phần trước)
        const result = await userService.createUser(user);

        if (result.success) {
            // Trả về phản hồi thành công với ID của người dùng vừa được thêm
            res.status(201).json({ message: 'Người dùng đã được tạo thành công!', user_id: result.userId });
        } else {
            // Trả về phản hồi lỗi nếu dữ liệu không hợp lệ hoặc có lỗi
            res.status(400).json({ message: result.error });
        }
    } catch (error) {
        // Xử lý lỗi và trả về thông báo lỗi
        console.error('Lỗi khi tạo người dùng:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi tạo người dùng.' });
    }
}

/**
 * Lấy thông tin người dùng theo user_id.
 * @param {Object} req - Đối tượng yêu cầu từ client.
 * @param {Object} res - Đối tượng phản hồi để gửi dữ liệu trở lại client.
 */
async function getUserByUserId(req, res) {
    const userId = req.params.userId; // Lấy user_id từ params

    try {
        // Gọi hàm getUserByUserId từ userService
        const user = await userService.getUserByUserId(userId);
        
        // Kiểm tra xem người dùng có tồn tại không
        if (user) {
            res.status(200).json({ message: 'Thông tin người dùng:', user });
        } else {
            res.status(404).json({ message: 'Người dùng không tồn tại.' });
        }
    } catch (error) {
        // Xử lý lỗi và trả về thông báo lỗi
        console.error('Lỗi khi lấy thông tin người dùng:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy thông tin người dùng.' });
    }
}

/**
 * Cập nhật thông tin người dùng theo user_id.
 * @param {Object} req - Đối tượng yêu cầu từ client.
 * @param {Object} res - Đối tượng phản hồi để gửi dữ liệu trở lại client.
 */
async function updateUser(req, res) {
    const userData = req.body; // Lấy dữ liệu người dùng mới từ body

    try {
        const result = await userService.updateUser(userData);
        
        // Gửi phản hồi dựa trên kết quả từ updateUser
        if (result.status) {
            res.status(200).json(result); // Trả về kết quả cập nhật thành công
        } else {
            res.status(404).json(result); // Trả về thông báo không tìm thấy người dùng
        }
    } catch (error) {
        console.error('Lỗi khi cập nhật người dùng:', error);
        res.status(500).json({ status: false, message: 'Đã xảy ra lỗi khi cập nhật thông tin người dùng.' });
    }
}
/**
 * Xóa người dùng theo user_id.
 * @param {Object} req - Đối tượng yêu cầu từ client.
 * @param {Object} res - Đối tượng phản hồi để gửi dữ liệu trở lại client.
 */
async function deleteUser(req, res) {
    const user_id = req.params.userId; // Lấy user_id từ params

    try {
        const result = await userService.deleteUser(user_id);
        
        // Gửi phản hồi dựa trên kết quả từ deleteUser
        if (result.status) {
            res.status(200).json(result); // Trả về kết quả xóa thành công
        } else {
            res.status(404).json(result); // Trả về thông báo không tìm thấy người dùng
        }
    } catch (error) {
        console.error('Lỗi khi xóa người dùng:', error);
        res.status(500).json({ status: false, message: 'Đã xảy ra lỗi khi xóa người dùng.' });
    }
}


/**
 * Lấy danh sách tất cả người dùng với phân trang và sắp xếp.
 * @param {Object} req - Đối tượng yêu cầu từ client.
 * @param {Object} res - Đối tượng phản hồi để gửi dữ liệu trở lại client.
 */
async function getAllUsers(req, res) {
    try {
        // Lấy các tham số từ query
        const page = parseInt(req.body.page, 10) || 1; // Trang hiện tại (mặc định là 1)
        const limit = parseInt(req.body.limit, 10) || 10; // Số bản ghi mỗi trang (mặc định là 10)
        const sortOrder = req.body.sortOrder === 'asc' ? 'asc' : 'desc'; // Thứ tự sắp xếp (mặc định là 'desc')

        // Gọi hàm từ service để lấy dữ liệu người dùng
        const result = await userService.getAllUsers({
            page,
            limit: limit,
            keyword: req.body.keyword || '', // Từ khóa tìm kiếm, nếu có
            sortOrder
        });

        // Trả về dữ liệu dưới dạng JSON với mã trạng thái 200
        return res.status(200).json({
            message: "All users retrieved successfully.",
            total: result.total,
            totalPages: result.totalPages,
            page: result.page,
            pageSize: result.pageSize,
            users: result.listUsers // Danh sách người dùng
        });
    } catch (error) {
        console.error('Error in getAllUsers:', error);
        // Trả về mã trạng thái 500 khi có lỗi
        return res.status(500).json({ message: 'Error retrieving users.' });
    }
}


module.exports = { createUser,getUserByUserId, updateUser, deleteUser,getAllUsers };