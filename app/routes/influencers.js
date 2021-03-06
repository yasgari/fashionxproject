var express = require('express');
var moment = require('moment');
var router = express.Router();
var util = require('../util/util');
var passport = require('passport');
var aws = require('aws-sdk')
var multer = require('multer')
var multerS3 = require('multer-s3')
const nodemailer = require('nodemailer');

var signup_controller = require('../controllers/signup-controller');
var post_controller = require('../controllers/post-controller');
var profile_controller = require('../controllers/profile-controller');
var rights_controller = require('../controllers/rights-controller');

var VALIDATION_ERRORS = util.VALIDATION_ERRORS;

// config 
var config = require('../config/config');

// setup AWS
aws.config.update({
    secretAccessKey: config.SECRET_ACCESS_KEY,
    accessKeyId: config.ACCESS_KEY_ID,
    region: config.REGION
});

const s3 = new aws.S3();

const upload = multer({
    storage: multerS3({
        s3: s3,
        acl: 'public-read',
        bucket: config.BUCKET_NAME,
        metadata: function (req, file, cb) {
            cb(null, Object.assign({}, req.body.product_link));
        },
        key: function (req, file, cb) {
            cb(null, req.user.email + '/' + Date.now() + '-' + file.originalname);
        }
    })
}).single('croppedImage'); // 10 specifies 10 max photos can be uploaded at a time

/**
 * Loads the login page once the user selects "influencer" on landing page.
 */

router.get('/', async (req, res, next) => {
    if (req.user) {
        var rights = await rights_controller.findRights(req.user.email);
        if (rights.rights == '1') {
            return res.redirect('/influencers/home');
        } else {
            return res.redirect('/influencers/applied')
        }
    }
    res.render('pages/influencers/login', { title: 'Login', errors: '', fields: ''});
});

/**
 * Route the user to the login page
 */
router.get('/login', async (req, res, next) => {
    if (req.user) {
        var rights = await rights_controller.findRights(req.user.email);
        if (rights.rights == '1') {
            return res.redirect('/influencers/home');
        } else {
            return res.redirect('/influencers/applied')
        }
    }
    res.render('pages/influencers/login', { title: 'Login', errors: '', fields: ''});
});

/**
 * Log out current user
 */
router.get('/logout', (req, res, next) => {
    req.logout();
    res.redirect('/influencers/login');
});

/**
 * After user has submitted application to be an influencer 
 */
router.get('/applied', (req, res, next) => {
    res.render('pages/influencers/applied', { title: 'Thank You' });
});

/**
 * This checks that the given credentials for login page were correct/found in the DB. If so, it will redirect user to 
 * home page, else, appear the login form populated with error messages (e.g. email not found in DB)
 */
router.post('/login', async (req, res, next) => {
    if (req.body.remember_me) {
        //req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000;
        req.session.cookie.maxAge = 21 * 24 * 60 * 60 * 1000;
    }
    passport.authenticate('local', async (err, user, info) => {
        if (user) {
            var rights = await rights_controller.findRights(user.email);
            req.logIn(user, (err) => {
                if (rights.rights == '1') {
                    return res.redirect('/influencers/home');
                } else {
                    return res.redirect('/influencers/applied')
                }
            })
        } else {
            return res.render('pages/influencers/login', { title: 'Login', errors: {'email': VALIDATION_ERRORS['CREDENTIALS_INVALID']}, fields: ''})
        }
    })(req, res, next);
});

/**
 * Loads signup form when user uses the signup link in the footer, or by typing it manually
 */
router.get('/signup', async (req, res, next) => {
    if (req.user) {
        if (rights.rights == '1') {
            return res.redirect('/influencers/home');
        } else {
            return res.redirect('/influencers/applied')
        }
    }
    res.render('pages/influencers/signup', { title: 'Sign Up', errors: '', fields: ''});
});

/**
 * Once a user clicks the 'sign up' button on the form, it will validate inputs and redirect user to home page if all 
 * goes well. If not, errors will be posted on the form itself.
 */

router.post('/signup', async (req, res, next) => {
    var errors = await signup_controller.validate(req.body);

    if (Object.keys(errors).length === 0 && errors.constructor === Object) {
        await signup_controller.signup(req.body);
        passport.authenticate('local', (err, user, info) => {
            if (user) {
                req.logIn(user, (err) => {
                    //send email to the person that applied (outgoing)
                    const transporter = nodemailer.createTransport({
                        
                        service: 'Outlook365',
                        host: "smtpout.secureserver.net",  
                        secureConnection: true,
                        port: 465,
                        auth: {
                        user: config.EMAIL,
                        pass: config.PASS
                        }
                    });
                    const mailOptions = {
                        from: config.EMAIL,
                        to: `${req.body.email}`,
                        subject: 'Thank You',
                        text: 'Thanks for applying to become an influencer. We will review your application shortly.',
                        replyTo: config.EMAIL
                    }
                    transporter.sendMail(mailOptions, function(err, res) {
                        if (err) {
                        console.error('there was an error: ', err);
                        } else {
                        console.log('here is the res: ', res)
                        }
                    })

                    //send email to fashionx that a new influencer applied (incoming)
                    const transporter2 = nodemailer.createTransport({
                        service: 'Outlook365',
                        host: "imap.secureserver.net",  
                        secureConnection: true,
                        port: 993,
                        auth: {
                        user: config.EMAIL,
                        pass: config.PASS
                        }
                    });
                    var emailText = 'Someone applied to be an influencer: \n' + "Email: "+ req.body.email + '\n'+ "Birthdate: "+req.body.dob + '\n' +"Instagram: "+req.body.instagram_handle + '\n'+
                    "LikeToKnowIt: "+req.body.likeToKnowIt + '\n' + "Blog: "+req.body.blog + '\n'+"Paypal: "+req.body.paypal + '\n'+"Height: "+req.body.height_ft + 'ft '+req.body.height_in + 'in\n'
                    +"Bust Band: "+req.body.bust_band + '\n'+"Bust cup: "+req.body.bust_cup + '\n'+"Waist: "+req.body.waist + '\n'+"Shirt Size: "+req.body.shirt_size + '\n'+"Jean Size: "+req.body.jean_size + '\n'
                    +"Torso Length: "+req.body.torso_length + '\n'+"Leg Length: "+req.body.leg_length + '\n';

                    const mailOptions2 = {
                        from: config.EMAIL, 
                        to: config.EMAIL,
                        subject: 'New Applicant',
                        text: emailText,
                        replyTo: config.EMAIL
                    }
                    transporter2.sendMail(mailOptions2, function(err, res) {
                        if (err) {
                        console.error('there was an error: ', err);
                        } else {
                        console.log('here is the res: ', res)
                        }
                    })
                    return res.redirect('/influencers/applied');
                })
            } else {
                return res.render('pages/influencers/login', { title: 'Login', errors: {'email': VALIDATION_ERRORS['CREDENTIALS_INVALID']}, fields: ''})
            }
        })(req, res, next);
    } else {
        res.render('pages/influencers/signup', { title: 'Sign Up', errors: errors, fields: req.body});
    }
});

/**
 * Once a user clicks the 'update' button on the form, it will validate inputs and redirect user to the My Profile page if all
 * goes well. If not, errors will be posted on the form itself.
 */
router.post('/updateProfile', async (req, res, next) => {
    req.body.email = req.user.email;
    var errors = await profile_controller.validate(req.body);

    if (Object.keys(errors).length === 0 && errors.constructor === Object) {
        await profile_controller.updateProfile(req.body.first_name, req.body.email, req.body.dob, req.body.instagram_handle, req.body.likeToKnowIt, req.body.blog, req.body.zip, req.body.paypal, req.body.height_ft, req.body.height_in, req.body.bust_band, req.body.bust_cup, req.body.waist, req.body.shirt_size, req.body.jean_size, req.body.torso_length, req.body.leg_length);
        return res.redirect('/influencers/profile');
    } else {
        console.log(error);
        var profile = await profile_controller.findProfile(req.user.email);
        res.render('pages/influencers/profile', { title: 'My Profile', profile: profile, errors: errors, fields: req.body});
    }
});

/**
 * Route the user to the influencer home page after authentication passes 
 */
router.get('/home', async (req, res, next) => {
    if (req.user) {
        var rights = await rights_controller.findRights(req.user.email);
        if (rights.rights == '1') {
            var posts = await post_controller.findAll(req.user.email);
            posts.forEach(post => {
                if (post.description.length > 200) {
                    post.description = post.description.substring(0, 200) + '...';
                }
            });
            return res.render('pages/influencers/home', { title: 'Home', posts: posts, moment: moment });
        } else {
            return res.redirect('/influencers/applied')
        }
    } else {
        res.redirect('/influencers/login');
    }
});

/**
 * If the user clicks the 'need help' button on the signup form, it will redirect to the manual for fashionxproject
 */
router.get('/manual', (req, res, next) => {
    res.render('pages/influencers/manual', {title: "Help"});
});

/**
 * Routes user to uplaod page when user clicks on plus square icon in the header.
 */
router.get('/submit', async (req, res, next) => {
    if (req.user) {
        var rights = await rights_controller.findRights(req.user.email);
        if (rights.rights == '1') {
            return res.render('pages/influencers/submit', { title: 'Submit Picture', errors: '', fields: '' });
        } else {
            return res.redirect('/influencers/applied')
        }
    } else {
        return res.redirect('/influencers/login');
    }
});

/**
 * Post creation and handlese photo uploads photo to S3
 */
router.post('/submit', async (req,res,next) => {
    var data = req.body;
    data.date = new Date();
    data.img_urls = data.img_urls.split(',');
    if (data.img_urls[data.img_urls.length - 1].length < 2) {
        data.img_urls.pop(); // Remove empty string since all img urls have , appended to end
    }
    await post_controller.push(data.type, data.item, data.size, data.brand, data.selling_price, data.original_price, data.condition, data.description, data.date, req.user.email, data.img_urls);
    return res.redirect('/influencers/home');
});

/**
 * Handle photo upload to S3
 */
router.post('/uploadPhoto', async (req,res,next) => {
    upload(req, res, async function (error) {
        if (error) {
            console.log(error);
            res.send('Upload failed!');
        }

        res.send(req.file.location);
    });
});

/**
 * View post
 */
router.get('/posts/:id', async (req, res, next) => {
    if (req.user) {
        var rights = await rights_controller.findRights(req.user.email);
        if (rights.rights == '1') {
            var post = await post_controller.find(req.params.id);
            var data;
            if (post.length) {
                data = post[0];
            }
            return res.render('pages/influencers/post', { title: 'View Post', item: data.item, post: data, moment: moment });
        } else {
            return res.redirect('/influencers/applied')
        }
    } else {
        return res.redirect('/influencers/login');
    }
});

/**
 * Edit post
 */
router.get('/posts/:id/edit', async (req, res, next) => {
    if (req.user) {
        var rights = await rights_controller.findRights(req.user.email);
        if (rights.rights == '1') {
            var post = await post_controller.find(req.params.id);
            var data;
            if (post.length) {
                data = post[0];
            }
            data.img_urls = data.img_urls.join(',') + ',';
            return res.render('pages/influencers/edit', { title: 'Edit Post', item: data.item, post: data, errors: '', fields: '' });
        } else {
            return res.redirect('/influencers/applied')
        }
    } else {
        return res.redirect('/influencers/login');
    }
});

/**
 * Update post
 */
router.post('/updatePost', async (req, res, next) => {
    var data = req.body;
    data.date = new Date();
    data.img_urls = data.img_urls.split(',');
    if (data.img_urls[data.img_urls.length - 1].length < 2) {
        data.img_urls.pop(); // Remove empty string since all img urls have , appended to end
    }

    await post_controller.update(data.id, data.type, data.item, data.size, data.brand, data.selling_price, data.original_price, data.condition, data.description, data.date, req.user.email, data.img_urls);
    return res.redirect('/influencers/home');
});

/**
 * View user profile
 */
router.get('/profile', async (req, res, next) => {
    if (req.user) {
        var rights = await rights_controller.findRights(req.user.email);
        if (rights.rights == '1') {
            var profile = await profile_controller.findProfile(req.user.email);
            return res.render('pages/influencers/profile', { title: 'My Profile', profile: profile, errors: '', fields: '' });
        } else {
            return res.redirect('/influencers/applied')
        }
    } else {
        return res.redirect('/influencers/login');
    }
});

/**
 * Delete post
 */
router.post('/posts/:id/delete', async (req, res, next) => {
    await post_controller.remove(req.params.id);
    return res.redirect('/influencers/home');
});

module.exports = router;