particlesJS('particles-js',

    {
        "particles": {
            "number": {
                "value": 80,
                "density": {
                    "enable": true,
                    "value_area": 800
                }
            },
            "color": {
                "value": "#ffffff"
            },
            "shape": {
                "type": "circle",
                "stroke": {
                    "width": 0,
                    "color": "#000000"
                },
                "polygon": {
                    "nb_sides": 5
                },
                "image": {
                    "src": "img/github.svg",
                    "width": 100,
                    "height": 100
                }
            },
            "opacity": {
                "value": 0.5,
                "random": false,
                "anim": {
                    "enable": false,
                    "speed": 1,
                    "opacity_min": 0.1,
                    "sync": false
                }
            },
            "size": {
                "value": 1,
                "random": false,
                "anim": {
                    "enable": false,
                    "speed": 40,
                    "size_min": 0.1,
                    "sync": false
                }
            },
            "line_linked": {
                "enable": true,
                "distance": 150,
                "color": "#ffffff",
                "opacity": 0.4,
                "width": 1
            },
            "move": {
                "enable": false,
                "speed": 2.5,
                "direction": "none",
                "random": false,
                "straight": false,
                "out_mode": "out",
                "attract": {
                    "enable": false,
                    "rotateX": 600,
                    "rotateY": 1200
                }
            }
        },
        "interactivity": {
            "detect_on": "canvas",
            "events": {
                "onhover": {
                    "enable": true,
                    "mode": "repulse"
                },
                "onclick": {
                    "enable": true,
                    "mode": "push"
                },
                "resize": true
            },
            "modes": {
                "grab": {
                    "distance": 400,
                    "line_linked": {
                        "opacity": 1
                    }
                },
                "bubble": {
                    "distance": 400,
                    "size": 40,
                    "duration": 2,
                    "opacity": 8,
                    "speed": 3
                },
                "repulse": {
                    "distance": 200
                },
                "push": {
                    "particles_nb": 4
                },
                "remove": {
                    "particles_nb": 2
                }
            }
        },
        "retina_detect": true,
        "config_demo": {
            "hide_card": false,
            "background_color": "#b61924",
            "background_image": "",
            "background_position": "50% 50%",
            "background_repeat": "no-repeat",
            "background_size": "cover"
        }
    }
);

function imageValid(file, exifData, accountId) {
    $('.alert').hide();
    var alertUrl = 'https://testnet.steexp.com/account/' + accountId;
    var validAlert = $('#imageValidAlert');
    validAlert.find('#meta-account a').attr("href", alertUrl);
    validAlert.find('#meta-account a').text(accountId);
    validAlert.find('#meta-owner').text(exifData.Make);
    validAlert.find('#meta-date').text(exifData.DateTimeDigitized);

    // convert GPS location
    var gpsLon = exifData.GPSLongitude;
    var gpsLat = exifData.GPSLatitude;
    var lon = gpsLon[0] + "° " + gpsLon[1] + "'" + gpsLon[2] + "\"";
    var lat = gpsLat[0] + "° " + gpsLat[1] + "'" + gpsLat[2] + "\"";
    var point = new GeoPoint(lon, lat);
    var urlLocation = point.getLatDec() + "," + point.getLonDec();
    validAlert.find('#meta-location a').text("Google Maps");
    validAlert.find('#meta-location a').attr("href", "http://maps.google.com/maps?q=" + urlLocation);

    // custom metadata
    try {
        const imageDescription = JSON.parse(exifData.ImageDescription);
        validAlert.find('#meta-deviceid').text(imageDescription.deviceID)
    }
    catch (e) {
        console.log(e)
    }

    validAlert.show();
}

function imageInvalid(file) {
    $('.alert').hide();
    $('#imageInvalidAlert').show();
}

function removeFiles() {
    for (i = 0, len = Dropzone.instances.length; i < len; i++) {
        Dropzone.instances[i].removeAllFiles(true);
    }
}

Dropzone.options.imageForm = {
    dictDefaultMessage: "Drop your image here or click for proofing the origin.",
    init: function () {
        this.on("addedfile", function (file) {

            $('.alert').hide();

            var reader = new FileReader();
            reader.onload = function (e) {
                var arrayBuffer = reader.result;

                // get hash of image
                var base64String = arrayBufferToBase64(arrayBuffer);
                var imageHash = new Hashes.SHA256().hex(base64String);
                console.log('Hash of image: ' + imageHash);

                // get Stellar account id
                EXIF.enableXmp();
                var exifData = EXIF.readFromBinaryFile(arrayBuffer);
                if (exifData.UserComment === undefined) { // check if account id is stored
                    imageInvalid(file);
                    removeFiles();
                    return;
                }
                var stellarAccount = exifData.UserComment.replace('stellar_', '');
                console.log('Stellar account ID: ' + stellarAccount);

                // check if hash match one on the Stellar account
                var server = new StellarSdk.Server('https://horizon-testnet.stellar.org');
                server.loadAccount(stellarAccount)
                    .then(function (account) {
                        return account.data_attr;
                    })
                    .then(function (storedData) {
                        var storedHashes = Object.keys(storedData);
                        if (storedHashes.indexOf(imageHash) > 0) {
                            imageValid(file, exifData, stellarAccount);
                        }
                        else {
                            imageInvalid(file);
                        }
                        removeFiles();
                    })
                    .catch(function (err) {
                        console.error(err);
                    });
            };

            reader.readAsArrayBuffer(file);
            return false;
        });
    }
};

function arrayBufferToBase64(buffer) {
    let binary = '';
    let bytes = new Uint8Array(buffer);
    let len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

$(document).ready(function () {

    StellarSdk.Network.useTestNetwork();
    console.log("document loaded");

});