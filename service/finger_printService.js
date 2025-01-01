const client = require("../config/mqqtConnect");
const dbConnect = require("../db/dbConnect");

async function createFingerPrint(data) {
    const connection = await dbConnect.getConnection(); // Lấy kết nối từ pool
    const { fingerprint_id, fingerprint_name, valid_until, user_id } = data;

    try {
        // Thêm vào cơ sở dữ liệu
        const query = `
            INSERT INTO fingerprints (fingerprint_id, fingerprint_name, valid_until, user_id)
            VALUES (?, ?, ?, ?)
        `;
        
        // Chạy query và trả về kết quả
        const [result] = await connection.execute(query, [fingerprint_id, fingerprint_name, valid_until, user_id]);

        // Trả kết nối lại vào pool
        connection.release();

        return {
            message: 'Fingerprint added successfully',
            fingerprint_id: fingerprint_id
        };
    } catch (error) {
        // Đảm bảo trả kết nối lại trong trường hợp có lỗi
        connection.release();

        console.error('Lỗi khi lưu vào cơ sở dữ liệu:', error);
        throw new Error('Lỗi khi lưu fingerprint vào cơ sở dữ liệu.');
    }
}

async function checkExpiredFingerprints() {
    const connection = await dbConnect.getConnection(); // Lấy kết nối từ pool

    try {
        // Truy vấn tất cả các dấu vân tay hết hạn (dù là 'active' hay 'inactive')
        const [results] = await connection.query(
            'SELECT fingerprint_id FROM fingerprints WHERE valid_until < NOW()'
        );

        // Kiểm tra nếu có dấu vân tay hết hạn
        if (results.length > 0) {
            // Lấy danh sách fingerprint_id của các dấu vân tay hết hạn
            const expiredFingerprints = results.map(fingerprint => fingerprint.fingerprint_id);

            // Cập nhật trạng thái thành 'inactive' chỉ cho những dấu vân tay đang ở trạng thái 'active'
            await connection.query(
                'UPDATE fingerprints SET status = "inactive" WHERE fingerprint_id IN (?) AND status = "active"',
                [expiredFingerprints]
            );

            console.log(`Đã cập nhật trạng thái thành 'inactive' cho các dấu vân tay active đã hết hạn.`);

            // Định dạng dữ liệu JSON gửi qua MQTT
            const message = JSON.stringify({
                list: expiredFingerprints // Đặt danh sách mảng trong trường `list`
            });

            // Gửi danh sách fingerprint_id hết hạn qua MQTT
            client.publish('/expiredFingerprints', message, (error) => {
                if (error) {
                    console.error('Lỗi khi gửi danh sách dấu vân tay hết hạn qua MQTT:', error);
                } else {
                    console.log('Danh sách dấu vân tay hết hạn đã được gửi.');
                }
            });
        } else {
            console.log('Không có dấu vân tay hết hạn.');
        }
    } catch (error) {
        console.error('Lỗi trong quá trình kiểm tra dấu vân tay hết hạn:', error);
        throw new Error('Đã xảy ra lỗi trong quá trình kiểm tra dấu vân tay.');
    } finally {
        connection.release(); // Đảm bảo trả kết nối lại pool
    }
}

// Hàm để gọi kiểm tra dấu vân tay hết hạn theo chu kỳ
function startExpiredCheck() {
    setInterval(async () => {
        try {
            await checkExpiredFingerprints();
        } catch (error) {
            console.error('Lỗi trong quá trình kiểm tra dấu vân tay hết hạn:', error);
        }
    }, 120000); // Kiểm tra mỗi 2 phút
}
async function deleteFingerPrint(data) {
    const connection = await dbConnect.getConnection(); // Lấy kết nối từ pool
    const { fingerprint_id } = data;

    const payload = {
        id: fingerprint_id
    };

    return new Promise((resolve, reject) => {
        try {
            // Gửi dữ liệu qua MQTT
            client.publish('/delete', JSON.stringify(payload), async (error) => {
                if (error) {
                    console.error('Lỗi khi gửi dữ liệu qua MQTT:', error);
                    return reject(new Error('Gửi dữ liệu qua MQTT thất bại.'));
                }

                console.log('Dữ liệu đã được gửi tới ESP32 qua MQTT.');

                // Lắng nghe phản hồi từ ESP32 qua MQTT
                client.on('message', async (topic, message) => {
                    if (topic === '/delete/response') {
                        const response = JSON.parse(message.toString());

                        if (response.status === 'failure') {
                            // Nếu ESP32 trả về lỗi, ném lỗi
                            reject(new Error(response.message || 'ESP32 báo lỗi trong quá trình xử lý.'));
                        } else if (response.status === 'success' && response.id) {
                            try {
                                // Xóa khỏi cơ sở dữ liệu
                                await connection.query(
                                    'DELETE FROM fingerprints WHERE fingerprint_id = ?',
                                    [response.id]
                                );
                                resolve({
                                    message: 'Fingerprint deleted successfully',
                                    fingerprint_id: response.id
                                });
                            } catch (dbError) {
                                console.error('Lỗi khi xóa trong cơ sở dữ liệu:', dbError);
                                reject(new Error('Lỗi khi xóa fingerprint khỏi cơ sở dữ liệu.'));
                            } finally {
                                connection.release(); // Đảm bảo trả kết nối lại pool
                            }
                        } else {
                            reject(new Error('Phản hồi từ ESP32 không hợp lệ.'));
                        }
                    }
                });

                // Đăng ký lắng nghe phản hồi
                client.subscribe('/delete/response', (err) => {
                    if (err) {
                        console.error('Lỗi khi đăng ký lắng nghe topic /delete/response:', err);
                        reject(new Error('Lỗi khi đăng ký lắng nghe MQTT.'));
                    }
                });
            });
        } catch (error) {
            console.error('Lỗi trong deleteFingerPrint:', error);
            reject(new Error('Đã xảy ra lỗi trong quá trình xử lý.'));
        }
    });
}
module.exports = { createFingerPrint, startExpiredCheck, deleteFingerPrint};