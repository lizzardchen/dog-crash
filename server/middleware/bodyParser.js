const bodyParser = require('body-parser');

/**
 * 自定义body解析中间件，用于处理客户端HTTP框架发送的特殊格式数据
 */
function customBodyParser(req, res, next) {
    // 如果已经有解析过的body，直接跳过
    if (req.body && Object.keys(req.body).length > 0) {
        return next();
    }

    // 收集原始数据
    let rawData = '';
    req.on('data', chunk => {
        rawData += chunk.toString();
    });

    req.on('end', () => {
        try {
            // 首先尝试解析为JSON
            if (rawData.startsWith('{') && rawData.endsWith('}')) {
                req.body = JSON.parse(rawData);
                return next();
            }

            // 如果不是JSON，尝试解析为URL编码格式
            if (rawData.includes('=') && rawData.includes('&')) {
                const params = new URLSearchParams(rawData);
                req.body = {};
                
                for (const [key, value] of params) {
                    // 尝试将字符串值转换为适当的类型
                    if (value === 'true') {
                        req.body[key] = true;
                    } else if (value === 'false') {
                        req.body[key] = false;
                    } else if (!isNaN(value) && value !== '') {
                        req.body[key] = Number(value);
                    } else {
                        req.body[key] = value;
                    }
                }
                
                console.log('Parsed URL-encoded data:', req.body);
                return next();
            }

            // 如果都不是，保持原始数据
            req.body = rawData;
            next();

        } catch (error) {
            console.error('Error parsing request body:', error);
            req.body = {};
            next();
        }
    });
}

module.exports = customBodyParser;