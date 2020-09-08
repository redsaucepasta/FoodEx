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
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set("useCreateIndex", true);
mongoose.set('useFindAndModify', false);


// <----------------------------------------------------------->


// SCHEMAS
const userSchema = new Schema({
  // _id: Schema.Types.ObjectId,
  username: String,
  password: String,
  cart: [{type: Schema.Types.ObjectId, ref: 'Cart'}]
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

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
  _id: Schema.Types.ObjectId,
  name: String,
  email: String,
  password: String,
  menu: [{type: Schema.Types.ObjectId, ref: 'Menu'}]
});

const menuSchema = new Schema({
  _id : {type: Schema.Types.ObjectId, ref: 'Outlet'},
  item:[{
    name: String,
    price: Number
  }]
});


// <----------------------------------------------------------->


// MODELS
const User = new mongoose.model("User", userSchema);
const Outlet = new mongoose.model("Outlet", outletSchema);
const Menu = new mongoose.model("Menu", menuSchema);
const Cart = new mongoose.model("Cart", cartSchema);

// <----------------------------------------------------------->


passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});


// <----------------------------------------------------------->


// lANDING PAGE
app.get("/", function(req, res){
  res.render("landing");
});



// USER HOME PAGE
app.get("/home", function(req, res){
  if (req.isAuthenticated()){
    Outlet.find({}, function(err, outlets){
      res.render("home", {outletList: outlets, user: req.user.username});
    });
  } else {
    res.redirect("/login");
  }
});


// MENU
app.get("/menu/:outletId", function(req, res) {
  if (req.isAuthenticated()){
    const requestedOutletId = req.params.outletId;
    Menu.findOne({_id: requestedOutletId}, function(err, foundMenu) {
      res.render("menu", {menu: foundMenu, outletId: requestedOutletId});
    });
  } else {
    res.redirect("/login");
  }
});

app.post("/menu/:outletId", function(req, res) {
  if (req.isAuthenticated()){
    const requestedOutletId = req.params.outletId;
    let body = req.body;
    let details = {};
    let detailsArray = [];
    let existingItems = [];
    let newArrayOfDetails = [];
    let outlet = "some outlet";
    let newQuantity = 0;
    console.log(body);
    Outlet.findOne({_id: requestedOutletId}, function(err, foundOutlet) {
      if(!err){
        outlet = foundOutlet.name;
      }
    });
    Menu.findOne({_id: requestedOutletId}, function(err, foundMenu) {
      if(!err){
        for(let itemname in body){
          itemq = body[itemname];
          if(itemq>0){
            (foundMenu.item).forEach(function(item) {
              if (item.name===itemname){
                details = {"name": item.name, "price": item.price, "quantity": Number(itemq)};
                detailsArray.push(details);
              }
            });
          }
        }
        // console.log("details array\n" + detailsArray);
        User.findOne({username: req.user.username}, function(err, foundUser) {
          if (!err) {
            Cart.findOne({_id: foundUser._id}, function(err, foundCart) {
              if(!err){
                console.log(foundCart.outlet);
                if(foundCart.outlet == ''){
                  Cart.findOneAndUpdate({_id: foundUser._id}, {$push: {item: detailsArray}, outlet: outlet}, function(err, succ) {
                    if(err){
                      console.log(err);
                    }
                    else {
                      res.redirect("/home/cart");
                    }
                  });
                }
                else if(foundCart.outlet == outlet){
                  Cart.findOne({_id: foundUser._id}, function(err, foundCart) {
                    existingItems = foundCart.item;
                    detailsArray.forEach(function(item) {
                      existingItems.forEach(function(existingItem) {
                        if(existingItem.name === item.name){
                          item.quantity = Number(item.quantity) + Number(existingItem.quantity);
                          existingItems.splice(existingItems.indexOf(existingItem), 1);
                        }
                      });
                    });
                    existingItems.forEach(function(existingItem){
                      details = {"name": existingItem.name, "price": existingItem.price, "quantity": Number(existingItem.quantity)};
                      detailsArray.push(details);
                    });
                    Cart.findOneAndUpdate({_id: foundUser._id}, {item: detailsArray, outlet: outlet}, function(err, succ) {
                      if(err){
                        console.log(err);
                      }
                      else {
                        res.redirect("/home/cart");
                      }
                    });
                  });
                  // res.send("items from same outlet exists");
                  // res.redirect("/home/cart");
                }
                else {
                  console.log("cart already has items form other outlets");
                  res.render("cartError");
                }
              }
            });
          }
          else {
            console.log(err);
          }
        });
      }
      else{
        console.log(err);
      }
    });
  } else {
    res.redirect("/login");
  }
});



// CART
app.get("/home/cart", function(req, res) {
  if(req.isAuthenticated()) {
    let total = 0;
    let outlet = "";
    let items = [];
    User.findOne({username: req.user.username}, function(err, foundUser){
      if (err) {
        console.log(err);
      }
      else {
        Cart.findOne({_id: foundUser._id}, function(err, foundCart) {
          if(!err){
            items = foundCart.item;
            items.forEach(function(item) {
              // console.log(item.price+ "  " + item.quantity);
              total = total + (item.price*item.quantity);
              // console.log(total);
            });
            outlet = foundCart.outlet;
            // console.log("\n"+total);
          }
          else {
            console.log(err);
          }
          // console.log(total);
          if(total===0){
            outlet=""
          }
          Cart.findOneAndUpdate({_id: foundUser._id}, {total: total, outlet:outlet}, function(err, foundCart) {
            // console.log("\n"+total);
        });
        Cart.findOne({_id: foundUser._id}, function(err, foundCart) {
          // console.log(foundCart);
          res.render("cart", {carttotal: foundCart.total, cart: foundCart.item, outlet: foundCart.outlet});
        });
        });
      }
    });
  }
  else {
        res.redirect("/login");
      }
});



app.get("/delete/:itemId", function(req, res) {
  if(req.isAuthenticated){
    let items = [];
    const requestedItemId = req.params.itemId;
    User.findOne({username: req.user.username}, function(err, foundUser) {
      if(!err){
        Cart.findOne({_id: foundUser._id}, function(err, foundCart) {
          if(!err){
            items = foundCart.item;
            for(let i=0; i<items.length; i++){
              if(items[i]._id == requestedItemId){
                if(items[i].quantity === 1){
                  items.splice(i,1);
                }
                else{
                  let newq = items[i].quantity - 1;
                  items[i].quantity = newq;
                }
              }
            }
            Cart.findOneAndUpdate({_id: foundUser._id}, {item: items}, function(err, succ) {
              if(err){
                console.log(err);
              }
              else{
                res.redirect("/home/cart");
              }
            });
          }
          else {
            console.log(err);
          }
        });
      }
    });
  }
  else {
    res.redirect("/login");
  }
});



// USER LOGIN
app.get("/login", function(req, res) {
  res.render("login");
});

app.post("/login", function(req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/home");
      });
    }
  });
});



// USER LOGOUT
app.get("/logout", function(req, res){
  User.findOne({username: req.user.username}, function(err, foundUser) {
    Cart.findOneAndUpdate({_id: foundUser._id},  { item: [ ], total: 0, outlet: "" }, function(err, succ) {
      if (err) {
        console.log(err);
      }
      else {
        console.log("emptied cart");
      }
    });
  });
  req.logout();
  res.redirect("/");
});



// USER SIGN UP
app.get("/signup", function(req, res) {
  res.render("register");
});

app.post("/signup", function(req, res) {
  User.register({username: req.body.username}, req.body.password, function(err, user) {
    if(err){
      console.log(err);
      res.redirect("/signup")
    }
    else{
      passport.authenticate("local")(req, res, function(){
        User.findOne({username: req.body.username}, function(err, foundUser) {
          if (err) {
            console.log(err);
          }
          else {
            const newCart = new Cart({
              _id: foundUser._id,
              total: 0
            });
            newCart.save();
          }
        });
        res.redirect("/");
      });
    }
  });
});







// <----------------------------------------------------------->




// OUTLET LOGIN
app.get("/outletlogin", function(req, res) {
  res.send("outlet login (GET)\n not yet programmed.");
});

app.post("outletlogin", function(res, req) {
  res.send("outlet login (POST)\n not yet programmed.");
});


// OUTLET SIGN UP
app.get("/outletsignup", function(req, res) {
  res.render("outlet-register");
});

app.post("/outletsignup", function(req, res) {
  const newOutlet = new Outlet({
    _id: new mongoose.Types.ObjectId(),
    name: req.body.name,
    email: req.body.username,
    password: req.body.password
  });
  newOutlet.save(function(err) {
    if(err){
      console.log(err);
    }
    else{
      Outlet.findOne({name: req.body.name}, function(err, foundOutlet) {
        const newMenu = new Menu({
          _id: foundOutlet._id
        });
        newMenu.save();
      });
      res.send("outlet registered");
    }

  });
});









app.listen(3000, function() {
  console.log("Server started on port 3000");
});
