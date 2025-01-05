const { createFingerPrint, deleteFingerPrint, enableFingerprint, disableFingerprint } = require("../service/finger_printService");
const client = require("../config/mqqtConnect");

async function createFingerprint (req, res) {
    const data = req.body;

    // if (!fingerprint_name || !valid_until || !user_id) {
    //     return res.status(400).json({ error: 'Missing required fields' });
    // }

    try {
        const result = await createFingerPrint(data);
        res.status(201).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
async function deleteFingerprint(req, res) {
    const data = req.body;

    // if (!fingerprint_id) {
    //     return res.status(400).json({ error: 'Missing required field: fingerprint_id' });
    // }

    try {
        const result = await deleteFingerPrint(data);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

async function quetvantay(req, res) {
    try {
        const data = req.body;

        if (!data) {
            return res.status(400).send({message:'Không có dữ liệu để gửi'});
        }

        client.publish('/create', JSON.stringify(data), (error) => {
            if (error) {
                console.error('Lỗi khi gửi dữ liệu:', error);
                return res.status(500).send({message:'Gửi dữ liệu thất bại.'});
            }
            res.status(200).send({message:'Dữ liệu đã được gửi thành công'});
            console.log("đã gửi dữ liệu đến /create")
        });
    } catch (error) {
        console.error('Lỗi:', error);
        res.status(500).send({message:'Đã xảy ra lỗi.'});
    }
}
async function huythem(req, res) {
    try {
        const data = req.body;

        if (!data) {
            return res.status(400).send({message:'Không có dữ liệu để gửi'});
        }

        client.publish('/cancel', JSON.stringify(data), (error) => {
            if (error) {
                console.error('Lỗi khi gửi dữ liệu:', error);
                return res.status(500).send({message:'Gửi dữ liệu thất bại.'});
            }
            res.status(200).send({message:'Dữ liệu đã được gửi thành công'});
            console.log("đã gửi dữ liệu đến /cancel")
        });
    } catch (error) {
        console.error('Lỗi:', error);
        res.status(500).send({message:'Đã xảy ra lỗi.'});
    }
}

async function enableFingerPrint(req, res) {
    try {
        const { fingerprint_id, valid_until } = req.body;

        // Kiểm tra dữ liệu đầu vào
        if (!fingerprint_id || !valid_until) {
            return res.status(400).send({ 
                message: 'Thiếu fingerprint_id hoặc valid_until trong yêu cầu.' 
            });
        }

        // Gọi service để xử lý logic
        const result = await enableFingerprint({ fingerprint_id, valid_until });

        // Trả về kết quả thành công
        res.status(200).send({
            data: result,
        });
    } catch (error) {
        console.error('Lỗi trong enableFingerprintController:', error);

        // Phân loại lỗi và trả về mã lỗi phù hợp
        if (error.message.includes('not found')) {
            return res.status(404).send({ message: error.message });
        } else if (error.message.includes('Missing required fields')) {
            return res.status(400).send({ message: error.message });
        } else {
            return res.status(500).send({ message: 'Đã xảy ra lỗi trên máy chủ.' });
        }
    }
}

async function disableFingerPrint(req, res) {
    try {
        const { fingerprint_id } = req.body;

        // Kiểm tra dữ liệu đầu vào
        if (!fingerprint_id) {
            return res.status(400).json({ 
                message: 'Thiếu fingerprint_id trong yêu cầu.' 
            });
        }

        // Gọi service để xử lý logic
        const result = await disableFingerprint({ fingerprint_id }); // Chú ý dùng đúng tên hàm trong service

        // Trả về kết quả thành công
        return res.status(200).json({
            message: "Fingerprint disabled successfully",
            data: result,
        });
    } catch (error) {
        console.error('Lỗi trong FingerdisableprintController:', error);

        // Phân loại lỗi và trả về mã lỗi phù hợp
        if (error.message.includes('not found')) {
            return res.status(404).json({ message: error.message });
        } else if (error.message.includes('Missing required fields')) {
            return res.status(400).json({ message: error.message });
        } else {
            return res.status(500).json({ message: 'Đã xảy ra lỗi trên máy chủ.' });
        }
    }
}

module.exports = {
    createFingerprint, deleteFingerprint, quetvantay, huythem, enableFingerPrint, disableFingerPrint
}