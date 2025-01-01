
const client = require("../config/mqqtConnect");
const accessService = require("../service/access_logService")
/**
 * Lấy tất cả các bản ghi truy cập với phân trang và sắp xếp theo access_time.
 * @param {Object} req - Đối tượng yêu cầu từ client.
 * @param {Object} res - Đối tượng phản hồi từ server.
 */
// Lấy tất cả các bản ghi truy cập với phân trang và lọc
async function getAllAccessLogs(req, res) {
    try {
        // Lấy các tham số từ query
        const page = parseInt(req.body.page, 10) || 1; // Trang hiện tại (mặc định là 1)
        const limit = parseInt(req.body.limit, 10) || 10; // Số bản ghi mỗi trang (mặc định là 10)
        const sortOrder = req.body.sortOrder === 'asc' ? 'asc' : 'desc'; // Thứ tự sắp xếp (mặc định là 'desc')
        const userId = req.body.userId || null; // Lọc theo userId (mặc định là null)
        const accessResult = req.body.accessResult || null; // Lọc theo accessResult (mặc định là null)

        // Gọi hàm từ service để lấy dữ liệu
        const data = { page: page, limit: limit, sortOrder: sortOrder, userId: userId, accessResult: accessResult };
        const result = await accessService.getAllAccessLogs(data);

        // Trả về dữ liệu dưới dạng JSON với mã trạng thái 200
        return res.status(200).json({
            message: "All access logs retrieved successfully.",
            total: result.total,
            totalPages: result.totalPages,
            page: result.page,
            limit: result.limit,
            logs: result.listAccess // Danh sách bản ghi truy cập
        });
    } catch (error) {
        console.error('Error in fetchAllAccessLogs:', error);
        // Trả về mã trạng thái 500 khi có lỗi
        return res.status(500).json({ message: 'Error retrieving access logs.' });
    }
}

/**
 * Lấy thông tin bản ghi truy cập theo log_id.
 * @param {Object} req - Đối tượng yêu cầu từ client.
 * @param {Object} res - Đối tượng phản hồi từ server.
 */
async function getAccessLog(req, res) {
    const logId = parseInt(req.params.logId); // Lấy logId từ tham số URL

    try {
        // Gọi hàm từ service để lấy dữ liệu
        const accessLog = await accessService.getAccessLog(logId);

        if (accessLog) {
            // Nếu tìm thấy bản ghi, trả về thông tin với mã trạng thái 200
            return res.status(200).json({
                message: "Access log retrieved successfully.",
                log: accessLog // Bản ghi truy cập tìm thấy
            });
        } else {
            // Nếu không tìm thấy bản ghi, trả về mã trạng thái 404
            return res.status(404).json({ message: 'Access log not found.' });
        }
    } catch (error) {
        console.error('Error in fetchAccessLog:', error);
        // Trả về mã trạng thái 500 khi có lỗi
        return res.status(500).json({ message: 'Error retrieving access log.' });
    }
}


/**
 * Thêm một bản ghi truy cập vào bảng access_logs.
 * @param {Object} req - Đối tượng yêu cầu từ client.
 * @param {Object} res - Đối tượng phản hồi từ server.
 */
async function createAccessLog(req, res) {
    const data = req.body; // Lấy dữ liệu từ yêu cầu

    try {
        // Gọi hàm từ service để thêm bản ghi
        const newAccessLog = await accessService.createAccessLog(data);

        // Trả về thông tin bản ghi vừa thêm với mã trạng thái 201
        return res.status(201).json({
            message: "Access log created successfully.",
            log_id: newAccessLog.log_id // Thông tin bản ghi mới được tạo
        });
    } catch (error) {
        console.error('Error in addAccessLog:', error);
        // Trả về mã trạng thái 500 khi có lỗi
        return res.status(500).json({ message: 'Error creating access log.' });
    }
}

async function receive(req, res) {
    try {
        const data = req.body;

        if (!data) {
            return res.status(400).send({message:'Không có dữ liệu để gửi'});
        }

        client.publish('/unlock', JSON.stringify(data), (error) => {
            if (error) {
                console.error('Lỗi khi gửi dữ liệu:', error);
                return res.status(500).send({message:'Gửi dữ liệu thất bại.'});
            }

            res.status(200).send({message:'Dữ liệu đã được gửi thành công'});
        });
    } catch (error) {
        console.error('Lỗi:', error);
        res.status(500).send({message:'Đã xảy ra lỗi.'});
    }
}


module.exports = {
    getAllAccessLogs,getAccessLog,createAccessLog, receive
};