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
        // Truy vấn tất cả các dấu vân tay
        const [results] = await connection.query(
            'SELECT fingerprint_id, valid_until, status FROM fingerprints'
        );

        // Danh sách vân tay hết hạn
        const expiredFingerprints = [];

        // Duyệt qua từng dấu vân tay để kiểm tra
        for (const fingerprint of results) {
            const { fingerprint_id, valid_until, status } = fingerprint;

            // Kiểm tra nếu thời gian `valid_until` đã hết hạn
            if (new Date(valid_until) < new Date()) {
                // Nếu đang active, chuyển trạng thái thành inactive
                if (status === 'active') {
                    await connection.query(
                        'UPDATE fingerprints SET status = "inactive" WHERE fingerprint_id = ?',
                        [fingerprint_id]
                    );
                    console.log(`Cập nhật trạng thái inactive cho fingerprint_id: ${fingerprint_id}`);
                }

                // Thêm fingerprint vào danh sách hết hạn (bao gồm cả inactive và active)
                expiredFingerprints.push(fingerprint_id);
            }
        }

        // Gửi danh sách vân tay hết hạn qua MQTT dù có hết hạn hay không
        const message = JSON.stringify({
            list: expiredFingerprints // Đặt danh sách mảng trong trường `list`
        });

        client.publish('/expiredFingerprints', message, (error) => {
            if (error) {
                console.error('Lỗi khi gửi danh sách dấu vân tay hết hạn qua MQTT:', error);
            } else {
                console.log('Danh sách dấu vân tay hết hạn đã được gửi:', expiredFingerprints);
            }
        });

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

/**
 * Cập nhật trạng thái dấu vân tay thành 'active' và đặt giá trị valid_until.
 *
 * @param {Object} data - Dữ liệu đầu vào để cập nhật.
 * @param {number} data.fingerprint_id - ID của dấu vân tay cần cập nhật.
 * @param {string} data.valid_until - Thời gian mới cho valid_until (định dạng ISO hoặc YYYY-MM-DD HH:mm:ss).
 * @returns {Object} - Kết quả cập nhật hoặc lỗi nếu xảy ra.
 */
async function enableFingerprint(data) {
    const connection = await dbConnect.getConnection(); // Lấy kết nối từ pool
    const { fingerprint_id, valid_until } = data;

    if (!fingerprint_id || !valid_until) {
        throw new Error("Missing required fields: fingerprint_id or valid_until");
    }

    try {
        // Cập nhật trạng thái và thời hạn
        const query = `
            UPDATE fingerprints
            SET status = 'active', valid_until = ?
            WHERE fingerprint_id = ?
        `;

        const [result] = await connection.execute(query, [valid_until, fingerprint_id]);

        // Kiểm tra số hàng được cập nhật
        if (result.affectedRows === 0) {
            throw new Error(`Fingerprint with ID ${fingerprint_id} not found.`);
        }

        // Trả kết nối lại vào pool
        connection.release();

        return {
            message: "Fingerprint updated successfully",
            fingerprint_id: fingerprint_id,
        };
    } catch (error) {
        // Đảm bảo trả kết nối lại trong trường hợp có lỗi
        connection.release();

        console.error("Lỗi khi cập nhật cơ sở dữ liệu:", error);
        throw new Error("Lỗi khi cập nhật fingerprint trong cơ sở dữ liệu.");
    }
}

async function disableFingerprint(data) {
    const connection = await dbConnect.getConnection(); // Lấy kết nối từ pool
    const { fingerprint_id } = data;

    if (!fingerprint_id) {
        throw new Error("Missing required fields: fingerprint_id");
    }

    try {
        // Cập nhật trạng thái và thời hạn
        const query = `
            UPDATE fingerprints
            SET status = 'inactive', valid_until = NULL
            WHERE fingerprint_id = ?
        `;

        const [result] = await connection.execute(query, [fingerprint_id]);

        // Kiểm tra số hàng được cập nhật
        if (result.affectedRows === 0) {
            throw new Error(`Fingerprint with ID ${fingerprint_id} not found.`);
        }

        return {
            message: "Fingerprint disabled successfully",
            fingerprint_id: fingerprint_id,
        };
    } catch (error) {
        console.error("Lỗi khi cập nhật cơ sở dữ liệu:", error);

        // Phân biệt lỗi và trả thông điệp rõ ràng hơn
        if (error.message.includes("not found")) {
            throw new Error(`Fingerprint with ID ${fingerprint_id} not found.`);
        }
        throw new Error("Lỗi khi cập nhật fingerprint trong cơ sở dữ liệu.");
    } finally {
        // Đảm bảo trả kết nối lại vào pool trong mọi trường hợp
        connection.release();
    }
}
module.exports = { createFingerPrint, startExpiredCheck, deleteFingerPrint, enableFingerprint,disableFingerprint};