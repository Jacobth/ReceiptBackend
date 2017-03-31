var express = require('express');
var app = express();
var fs = require('fs');
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();
var bodyParser = require('body-parser');
var StringDecoder = require('string_decoder').StringDecoder;
var port = 3000;
var ip = app.adress;
var async = require('async'); 
var exec = require('child_process').exec, child;

app.listen(port, function () {
  console.log('Listening on port ' + port);
});

function rawBody(req, res, next) {
    var chunks = [];

    req.on('data', function(chunk) {
        chunks.push(chunk);
    });

    req.on('end', function() {
        var buffer = Buffer.concat(chunks);

        req.bodyLength = buffer.length;
        req.rawBody = buffer;
        next();
    });

    req.on('error', function (err) {
        console.log(err);
        res.status(500);
    });
}

app.post('/upload-video', rawBody, function (req, res) {

    if (req.rawBody && req.bodyLength > 0) {

        var decoder = new StringDecoder('utf8');
        var str = decoder.write(req.rawBody);

        var crypto = require('crypto');
        var link = crypto.createHash('md5').update(str).digest('hex');
        console.log(link);

        var base = 'C:/Users/jacobth/Documents/GitHub/ReciptBackend';

        var videoFile = ".mp4";
        var newPath = base + "/uploads/video/" + link + videoFile;

        var imgFile = ".png";
        var resultPath = base + "/results/" + link + imgFile;

        console.log(newPath);
    
        async.waterfall([
          function writeFile(writeFileCallback) {
            
            fs.writeFile(newPath, req.rawBody, function (error) {
                  if (!error) {
                      console.log("File successfully written");
                  }

                  writeFileCallback(error);
              });
        },

        function processFile(processFileCallback) {
            child = exec('java -cp ' +  base + '/kvittoscanner_main.jar Main ' + newPath + ' ' + resultPath,
              
              function (error, stdout, stderr){
      
                console.log('stdout: ' + stdout);
                console.log('stderr: ' + stderr);
    
                if(error){
                  console.log('exec error: ' + error);
                }
            
                processFileCallback(null);
              });
        },

        function sendFile(sendFileCallback) {
          res.sendFile(resultPath);
          sendFileCallback(null);
        }

      ], function (error) {
          if (error) {
          }
    });
       
   // fs.unlink(resultPath);
   // fs.unlink(newPath);         
  }
});



app.post('/upload-image', rawBody, function (req, res) {

    if (req.rawBody && req.bodyLength > 0) {

        var decoder = new StringDecoder('utf8');
        var str = decoder.write(req.rawBody);

        var crypto = require('crypto');
        var link = crypto.createHash('md5').update(str).digest('hex');
        console.log(link);

        var imageFile = ".png";
        var newPath = __dirname + "/uploads/hdr/" + link + imageFile;

      fs.writeFile(newPath, req.rawBody, function (err) {
        });

        var child = require('child_process').spawn('java', ['-jar', 'kvittoscanner.jar', newPath]);

        var imgFile = ".png";
    var sendPath = __dirname + "/results/test"  + imgFile;
    res.sendFile(sendPath); 

    fs.unlink(sendPath);
    fs.unlink(newPath);
  }
});