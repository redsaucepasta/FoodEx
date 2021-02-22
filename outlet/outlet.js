// require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require('mongoose-findorcreate');
const Schema = mongoose.Schema;
const app = express();


// <----------------------------------------------------------->


app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "Secret Key",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("'mongodb://localhost:27017/FoodEx", {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set("useCreateIndex", true);
mongoose.set('useFindAndModify', false);


// <----------------------------------------------------------->


// SCHEMAS
const userSchema = new Schema({
  username: String,
  password: String,
  name: String,
  block: String,
  room: Number,
  phone: Number,
  cart: [{type: Schema.Types.ObjectId, ref: 'Cart'}]
});


const cartSchema = new Schema({
  _id : {type: Schema.Types.ObjectId, ref: 'User'},
  outlet: String,
  item: [{
    name: String,
    price: Number,
    quantity: Number
  }],
  total: Number
});

const outletSchema = new Schema({
  name: String,
  phone: Number,
  username: String,
  password: String,
  menu: [{type: Schema.Types.ObjectId, ref: 'Menu'}]
});
outletSchema.plugin(passportLocalMongoose);
outletSchema.plugin(findOrCreate);

const menuSchema = new Schema({
  _id : {type: Schema.Types.ObjectId, ref: 'Outlet'},
  outletName: String,
  item:[{
    name: String,
    price: Number
  }]
});

const orderSchema = new Schema({
    username: String,
    name: String,
    block: String,
    room: Number,
    userPhone: Number,
    outletName: String,
    outletPhone: Number,
    payment: String,
    item: [{
      name: String,
      price: Number,
      quantity: Number
    }],
    total: Number,
    status: {
      type: String,
      default: "Placed"
    }
  },
  {
    timestamps: true
  }
);



// <----------------------------------------------------------->


// MODELS
const User = new mongoose.model("User", userSchema);
const Outlet = new mongoose.model("Outlet", outletSchema);
const Menu = new mongoose.model("Menu", menuSchema);
const Cart = new mongoose.model("Cart", cartSchema);
const Order = new mongoose.model("Order", orderSchema);

// <----------------------------------------------------------->

passport.use('local.two', Outlet.createStrategy());

passport.serializeUser(function(outlet, done) {
  done(null, outlet.id);
});
passport.deserializeUser(function(id, done) {
  Outlet.findById(id, function(err, outlet) {
    done(err, outlet);
  });
});

// <----------------------------------------------------------->


// lANDING PAGE
app.get("/", function(req, res){
  res.render("landing");
});

// <----------------------------------------------------------->

// OUTLET HOME PAGE
app.get("/home", function(req, res) {
  if(req.isAuthenticated()){
    Outlet.findOne({username: req.user.username}, function(err, foundOutlet) {
      Order.find({outletName: foundOutlet.name}, function(err, foundOrders) {
        if(err){
          console.log(err);
        }
        else {
          foundOrders = foundOrders.reverse();
          res.render("home", {outlet: foundOutlet, orders: foundOrders});
        }
      });
    });
  }
  else{
    res.redirect("/login");
  }
});




// ADD ITEM TO MENU
app.get('/addItem/:outletId', function(req, res) {
  if(req.isAuthenticated()){
    Outlet.findOne({username: req.user.username}, function(err, foundOutlet) {
      res.render("addItem", {outlet: foundOutlet});
    });
  }
  else{
    res.redirect("/login");
  }
});

app.post("/addItem/:outletId", function(req, res) {
  if(req.isAuthenticated()){
    const details = {
      name: req.body.name,
      price: Number(req.body.price)
    };
    Menu.findOneAndUpdate({_id: req.params.outletId}, {$push: {item: details}}, function(err, succ) {
      if(err){
        console.log(err);
      }
      else {
        console.log("added");
        console.log(details);
        res.redirect("/addItem/" + req.params.outletId);
      }
    });
  }
  else {
    res.redirect("/login");
  }
});


// ORDERS
app.get("/orders", function(req, res) {
  if(req.isAuthenticated()){
    Outlet.findOne({username: req.user.username}, function(err, foundOutlet) {
      if(err){
        console.log(err);
      }
      else {
        Order.find({outletName: foundOutlet.name}, function(err, foundOrders) {
          if (err) {
            console.log(err);
          }
          else {
            foundOrders = foundOrders.reverse();
            res.render("orders", {outlet: foundOutlet, orders: foundOrders});
          }
        });
      }
    });
  }
  else{
    res.redirect("/login");
  }
});


// ACCEPT ORDER
app.get("/order/:orderId/accept", function(req, res) {
  if(req.isAuthenticated()){
    const requestedOrderId = req.params.orderId;
    Order.findOneAndUpdate({_id: requestedOrderId}, {status: "Accepted"}, function(err, succ) {
      if (err) {
        console.log(err);
      }
      else {
        res.redirect("/home");
      }
    });
  }
  else {
    res.redirect("/login");
  }
});

// REJECT ORDER
app.get("/order/:orderId/reject", function(req, res) {
  if(req.isAuthenticated()){
    const requestedOrderId = req.params.orderId;
    Order.findOneAndUpdate({_id: requestedOrderId}, {status: "Rejected"}, function(err, succ) {
      if (err) {
        console.log(err);
      }
      else {
        res.redirect("/home");
      }
    });
  }
  else {
    res.redirect("/login");
  }
});

// DISPATCH ORDER
app.get("/order/:orderId/dispatch", function(req, res) {
  if(req.isAuthenticated()){
    const requestedOrderId = req.params.orderId;
    Order.findOneAndUpdate({_id: requestedOrderId}, {status: "Dispatched"}, function(err, succ) {
      if (err) {
        console.log(err);
      }
      else {
        res.redirect("/home");
      }
    });
  }
  else {
    res.redirect("/login");
  }
});

// ORDER DELIVERED
app.get("/order/:orderId/delivered", function(req, res) {
  if(req.isAuthenticated()){
    const requestedOrderId = req.params.orderId;
    Order.findOneAndUpdate({_id: requestedOrderId}, {status: "Delivered"}, function(err, succ) {
      if (err) {
        console.log(err);
      }
      else {
        res.redirect("/home");
      }
    });
  }
  else {
    res.redirect("/login");
  }
});




// OUTLET LOGIN
app.get("/login", function(req, res) {
  res.render("login");
});

app.post("/login", function(req, res) {
  const outlet = new Outlet({
    username: req.body.username,
    password: req.body.password
  });

  req.login(outlet, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local.two")(req, res, function(){
        res.redirect("/home");
      });
    }
  });
});


// OUTLET LOGOUT
app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});



// OUTLET SIGN UP
app.get("/signup", function(req, res) {
  res.render("register");
});

app.post("/signup", function(req, res) {
  Outlet.register({username: req.body.username, name: req.body.name, phone: req.body.phone}, req.body.password, function(err, outlet) {
    if(err){
      console.log(err);
      res.redirect("/signup")
    }
    else{

      Outlet.findOne({username: req.body.username}, function(err, foundOutlet) {
        if (err) {
          console.log(err);
        }
        else {
          const newMenu = new Menu({
            _id: foundOutlet._id,
            outletName: foundOutlet.name
          });
          newMenu.save();
        }
      });
      res.redirect("/");
    }
  });
});


// <----------------------------------------------------------------------->

// SORTING FUNCTION
function compare(a, b) {
  const itemA = a.name.toUpperCase();
  const itemB = b.name.toUpperCase();

  let comparison = 0;
  if (itemA > itemB) {
    comparison = 1;
  } else if (itemA < itemB) {
    comparison = -1;
  }
  return comparison;
}






app.listen(process.env.PORT || 8000, function() {
  console.log("Outlet Server\nServer started on port 8000");
});
