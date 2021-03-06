var express = require('express');
var app = express();
var fs = require('fs');
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();
var bodyParser = require('body-parser');
var StringDecoder = require('string_decoder').StringDecoder;
var port = 80;
var ip = app.adress;
var async = require('async'); 
var exec = require('child_process').exec, child;
var vision = require('@google-cloud/vision');
var base = __dirname;
var request = require('request');

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
        var arr = str.split("start");
        var token = arr[1];
        console.log(token);

        var crypto = require('crypto');
        var link = crypto.createHash('md5').update(str).digest('hex');
        console.log(link);

     

        var videoFile = ".mp4";
        var newPath = base + "/uploads/video/" + link + videoFile;

        var imgFile = ".jpg";
        var resultPath = base + "/results/" + link + imgFile;

        var args = 'video ' + newPath + ' ' + resultPath; 

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
            child = exec('java -cp ' +  base + '/kvittoscanner_main.jar Main ' + args,
              function (error, stdout, stderr){
      
                  if(error){
                    console.log('exec error: ' + error);
                  }

                  else {
                    console.log('image written successfully');
                  }
            
                  processFileCallback(null);
                });

            child.stdout.on('data', function(data) {
              console.log(data);
              if(data != null) {
                sendMessageToUser(token, { message: data});   
              }
            
            });

            child.stderr.on('data', function (data) {
                console.log('stderr: ' + data.toString());
                console.log('process failed');
                if(data !=null) {
                  sendMessageToUser(token, { message: data}); 
                }
            });
        },

        function sendFile(sendFileCallback) {
            res.sendFile(resultPath);
            sendFileCallback(null);
        },

        function removeFiles(removeFilesCallback) {
         // fs.unlink(resultPath);
         // fs.unlink(newPath);
            removeFilesCallback(null);  
        }

      ], function (error) {
          if (error) {
          }
    });
             
  }
});

app.post('/scan', rawBody, function (req, res) {

    if (req.rawBody && req.bodyLength > 0) {

        var decoder = new StringDecoder('utf8');
        var str = decoder.write(req.rawBody);

        var crypto = require('crypto');
        var link = crypto.createHash('md5').update(str).digest('hex');
        console.log(link);

        var jsonPath = __dirname + '/receptscanner-17776558c994.json';

        var visionClient = vision({
          keyFilename: jsonPath,
          projectId: 'receptscanner'
        });

        var result = '';
        var imageFile = ".jpg";
        var image = base + "/uploads/image/" + link + imageFile;

        async.waterfall([
            function readFile(readFileCallback) {
              fs.writeFile(image, req.rawBody, function (error) {

                if (!error) {
                  console.log("File successfully written");
                  visionClient.detectText(image).then((results) => {

                const detections = results[0];
                console.log('Text:');
                detections.forEach((text) => result += text);
                readFileCallback(null);
              });
                }

                else {
                  res.send('!');
                } 
            });
        },

          function sendFile(sendFileCallback) {
            res.send(result);
            console.log(result);
            sendFileCallback(null);
          }

         ], function (error) {
          if (error) {
          }
      });
    }
});

app.post('/upload-image', rawBody, function (req, res) {

    if (req.rawBody && req.bodyLength > 0) {
        var decoder = new StringDecoder('utf8');
        var str = decoder.write(req.rawBody);
        var arr = str.split("start");
        var message = arr[1].split(",");
        var folder = message[0];
        var count = message[1];
      
        var crypto = require('crypto');
        var link = crypto.createHash('md5').update(str).digest('hex');
        console.log(link);

        var imageFile = ".jpg";
        var newPath = __dirname + "/uploads/hdr/" + folder;
        var imgPath = newPath + "/" + link + imageFile;

        if(!fs.existsSync(newPath)) {
          fs.mkdirSync(newPath);
        }

        fs.writeFile(imgPath, req.rawBody, function (err) {
          if(!err) {
            res.send('Completed');
          }

          else {
            res.send('Error');
          }

        });
  }       
});

app.post('/get-hdr', rawBody, function (req, res) {

    if (req.rawBody && req.bodyLength > 0) {

        var decoder = new StringDecoder('utf8');
        var str = decoder.write(req.rawBody);
        var arr = str.split(',');
        var path = arr[0];
        var method = arr[1];
        var token = arr[2];

        var crypto = require('crypto');
        var link = crypto.createHash('md5').update(str).digest('hex');
        console.log(link);

   
        var newPath = base + '/uploads/hdr/' + path;
        var imageFile = ".jpg";
        var resultPath = base + "/results/" + link + imageFile; 
        console.log(newPath);
    
        var args = 'hdr' + ' ' + newPath + ' ' + method + ' ' + resultPath;

        async.waterfall([
        function processFile(processFileCallback) {
            child = exec('java -cp ' +  base + '/kvittoscanner_main.jar Main ' + args,
              
              function (error, stdout, stderr){
      
                console.log('stdout: ' + stdout);
                console.log('stderr: ' + stderr);
    
                if(error){
                  console.log('exec error: ' + error);
                }

                else {
                  console.log('image written successfully');
                }
            
                processFileCallback(null);
              });

            child.stdout.on('data', function(data) {
              console.log(data);
              if(data != null) {
                sendMessageToUser(token, { message: data});   
              }
            
            });

            child.stderr.on('data', function (data) {
                console.log('stderr: ' + data.toString());
                console.log('process failed');
                if(data !=null) {
                  sendMessageToUser(token, { message: data}); 
                }
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
             
  }
});

function sendMessageToUser(deviceId, message) {
  request({
    url: 'https://fcm.googleapis.com/fcm/send',
    method: 'POST',
    headers: {
      'Content-Type' :' application/json',
      'Authorization': 'key=AIzaSyC_uRR34-4miIdE808MvB0KkDg1Kpe42Jg'
    },
    body: JSON.stringify(
      { "data": message
        ,
        "to" : deviceId
      }
    )
  }, function(error, response, body) {
    if (error) {
      console.error(error, response, body);
    }
    else if (response.statusCode >= 400) {
      console.error('HTTP Error: '+response.statusCode+' - '+response.statusMessage+'\n'+body);
    }
    else {
      console.log('Done!');
    }
  });
}