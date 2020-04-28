const request = require('request');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const token = JSON.parse(fs.readFileSync('token.json')).value;

let bot = new TelegramBot(token, { polling: true });



bot.onText(/\/start/, (msg, match) => {
    let fromId = msg.from.id;
    let response = `Привет я бот для создания и чтения QR кодов. Отправь мне QR-код который хочешь раскодировать картинкой и я отвечу тебе результатом. Либо отправь мне сообщение или ссылку которую надо превратить в QR-код и я пришлю тебе его.`;
    bot.sendMessage(fromId, response)
        .then(res => {})
        .catch(err => {});
});


bot.onText(/\/echo (.+)/, function (msg, match) {
    let fromId = msg.from.id;
    let response = match[1];
    bot.sendMessage(fromId, response)
        .then(res => {})
        .catch(err => {});
});
bot.onText(/(.+)/, (msg, match) => {
    let fromId = msg.from.id;
    let response = null;
    let chatId = msg.chat.id;
    if(msg.text==='/start') return;
    if(msg.text.length>=900) {
        response = 'я не смогу обработь столько(\n надо меньше 900 символов';
        bot.sendMessage(fromId, response)
            .then(res => {})
            .catch(err => {});
    }
    else {
        let url = 'http://api.qrserver.com/v1/create-qr-code/?data='+msg.text+'&size=300x300';

        download(encodeURI(url), fromId+'.png', function(){
            bot.sendPhoto(chatId, fromId+'.png', { caption: '' })
                .then(res => {})
                .catch(err => {});
        });

    }
    // console.log(msg);

});


bot.on('message', function (msg) {
    let chatId = msg.chat.id;
    let fromId = msg.from.id;
if(msg.photo) {
    console.log('это фото');
    console.log(msg);
    let fileId= msg.photo[0].file_id;
    let url = `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`;
    request.get(url,{json:true},(err,res,body)=> {
        if (err) { return console.log(err); }
        if(body.ok) {
            let url = `https://api.telegram.org/file/bot${token}/${body.result.file_path}`;
            // const encoded = encodeURI(url);
            // let urlToQRServer = `http://api.qrserver.com/v1/read-qr-code/?fileurl=${url}`;

            // hard code index 1
            //
            console.log(body.result.file_path);
            let name = chatId +'_'+ body.result.file_path.split('/')[1];
            // let name = body.result.file_id + '.' + body.result.file_path.split('.')[1];
            download(encodeURI(url), name, function () {
                console.log('save');
                let options = {
                    'method': 'POST',
                    'url': 'http://api.qrserver.com/v1/read-qr-code/',
                    'headers': {
                        'Content-Type': 'multipart/form-data; boundary=----WebKitFormBoundary48Qq5JpqOOQvQtGC',
                    },
                    formData: {
                        'file': {
                            'value': fs.createReadStream(name),
                            'options': {
                                'filename': name,
                                'contentType': null
                            }
                        }
                    }
                };
                request(options, function (error, response) {
                    let json = JSON.parse(response.body);
                    bot.sendMessage(fromId, json[0].symbol[0].data)
                        .then(res => {})
                        .catch(err => {});
                });
            });
        }
    });

} else {
    console.log('это не фото');
    return;
}


});


const download = function(uri, filename, callback){
    request.head(uri, function(err, res, body){
        console.log('content-type:', res.headers['content-type']);
        console.log('content-length:', res.headers['content-length']);

        request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
};

