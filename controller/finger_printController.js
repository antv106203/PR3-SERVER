const { createFingerPrint, deleteFingerPrint } = require("../service/finger_printService");
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

module.exports = {
    createFingerprint, deleteFingerprint, quetvantay, huythem
}