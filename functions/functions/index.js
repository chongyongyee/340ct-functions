const functions = require("firebase-functions");
const express = require("express");
const app = express();

const { admin, db } = require("./util/admin");
const cors = require("cors");

const { generateRandomNumber } = require("./util/fileNameGenerator");

const config = {
  apiKey: "AIzaSyDMk8RDCI_rQhU9TSKZ5vPrg2c1xNy_QC4",
  authDomain: "ct-fbfbf.firebaseapp.com",
  projectId: "ct-fbfbf",
  storageBucket: "ct-fbfbf.appspot.com",
  messagingSenderId: "573776920927",
  appId: "1:573776920927:web:02c8a8dbab12dcc4f376ea",
  measurementId: "G-517RN07XTJ",
};

const DBAuth = require("./util/dbAuth");

const firebase = require("firebase");
firebase.initializeApp(config);

const {
  validateSignUpData,
  capitaliseName,
  validateLogInData,
  validatePrice,
  validateReview,
  validateNewBookData,
} = require("./util/validators");
const { equal } = require("assert");

const corsOptions = {
  origin: "http://localhost:3000",
  credentials: true, //access-control-allow-credentials:true
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));

//add stock
app.post("/stock", (req, res) => {
  const newBook = {
    title: req.body.title,
    author: req.body.author,
    isbn: req.body.isbn,
    stock: req.body.stock,
    price: req.body.price,
    category: req.body.category,
    description: req.body.description,
    bookCover: "na",
    discount: req.body.discount,
    active: "active",
    createdAt: new Date().getTime(),
  };

  const { valid, errors } = validateNewBookData(newBook);

  if (!valid) return res.status(400).json(errors);

  admin
    .firestore()
    .collection("books")
    .add(newBook)
    .then((doc) => {
      res.json({ bookID: doc.id });
    })
    .catch((error) => {
      res.status(500).json({ error: `Something went wrong` });
      console.error(error);
    });
});

app.post("/sales", (req, res) => {
  const sale = {
    bookID: req.body.bookID,
    username: req.body.username,
    price: req.body.price,
    createdAt: new Date().getTime(),
    title: req.body.title,
    bookCover: req.body.bookCover,
  };

  db.collection("sales")
    .add(sale)
    .then(() => {
      return res.json({ message: "Successfully added sale" });
    })
    .catch((error) => {
      res.status(500).json({ error: `Something went wrong` });
      console.error(error);
    });
});

app.get("/dashboard", (req, res) => {
  //number of books
  //number of sales
  //number of profits

  //get books, and set counter for each book
  //get sales and add total amount and set counter
  //return books, number of sales, number of books, and profits

  let dashboard = {
    books: [],
    numOfSales: 0,
    profits: 0,
    numOfBooks: 0,
  };

  let numBooks = 0;
  let numSales = 0;
  let profits = 0;

  db.collection("books")
    .get()
    .then((data) => {
      data.forEach((doc) => {
        numBooks = numBooks + 1;
        let tempBook = doc.data();
        tempBook.bookID = doc.id;
        dashboard.books.push(tempBook);
      });
      return numBooks;
    })
    .then((numBook) => {
      dashboard.numOfBooks = numBook;

      db.collection("sales")
        .get()
        .then((data) => {
          data.forEach((doc) => {
            numSales = numSales + 1;
            let tempPrice = doc.data().price;
            profits = profits + parseFloat(tempPrice);
          });

          dashboard.numOfSales = numSales;
          dashboard.profits = profits;

          return res.json(dashboard);
        });
    })
    .catch((error) => {
      res.status(500).json({ error: `Something went wrong` });
      console.error(error);
    });
});

//show all books
app.get("/stock", (req, res) => {
  admin
    .firestore()
    .collection("books")
    .get()
    .then((data) => {
      let books = [];
      data.forEach((doc) => {
        books.push({
          title: doc.data().title,
          author: doc.data().author,
          category: doc.data().category,
          description: doc.data().description,
          author: doc.data().author,
          bookCover: doc.data().bookCover,
          isbn: doc.data().isbn,
          stock: doc.data().stock,
          price: doc.data().price,
          bookID: doc.id,
        });
      });
      return res.json(books);
    })
    .catch((error) => {
      res.status(500).json({ error: `Something went wrong` });
      console.error(error);
    });
});

//update price
app.post("/price", (req, res) => {
  const newPrice = {
    price: req.body.price,
  };

  db.doc(`/books/${req.body.bookID}`)
    .update(newPrice)
    .then(() => {
      return res.json({ message: "Price updated successfully" });
    })
    .catch((error) => {
      res.status(500).json({ error: `Something went wrong` });
      console.error(error);
    });
});

//get the last created book
app.get("/last-created-book", (req, res) => {
  let bookID;

  db.collection("books")
    .orderBy("createdAt", "asc")
    .limit(1)
    .get()
    .then((data) => {
      data.forEach((doc) => {
        bookID = doc.id;
      });
      return res.json({ bookID: bookID });
    })
    .catch((error) => {
      res.status(500).json({ error: `Something went wrong` });
      console.error(error);
    });
});

//show one book
app.post("/get-book", (req, res) => {
  console.log(req.body.bookID);
  const bookDocument = db.doc(`/books/${req.body.bookID}`);
  console.log(req.body.bookID);
  //get book details
  //get reviews for the book

  const book = {
    bookData: {},
    reviews: [],
  };

  bookDocument
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Book not found" });
      }
      book.bookData = doc.data();
      book.bookData.bookID = doc.id;

      let numOfClicks;

      if (doc.data().views) {
        numOfClicks = doc.data().views();
      } else {
        numOfClicks = 1;
      }

      bookDocument
        .update({
          clicks: numOfClicks,
        })
        .then(() => {
          //clicks updated

          //get reviews
          db.collection("reviews")
            .where("bookID", "==", req.body.bookID)
            .get()
            .then((data) => {
              data.forEach((doc) => {
                book.reviews.push(doc.data());
              });
              return res.json(book);
            });
        });
    })
    .catch((error) => {
      console.error(error);
    });
});

//get all user data
app.post("/user-data", DBAuth, (req, res) => {
  //get all user data from users
  //get user history data
  //get user cart data

  const user = {
    credentials: {},
    history: [],
    cart: {},
  };

  db.doc(`/users/${req.user.username}`)
    .get()
    .then((doc) => {
      user.credentials = doc.data();
      return db
        .collection("history")
        .where("username", "==", req.user.username)
        .get();
    })
    .then((data) => {
      data.forEach((doc) => {
        user.history.push(doc.data());
      });
      return db.doc(`/cart/${req.user.username}`).get();
    })
    .then((doc) => {
      user.cart = doc.data();
    })
    .then(() => {
      return res.json(user);
    })
    .catch((error) => {
      console.error(error);
      return res.status(500).json({ message: "Something went wrong" });
    });
});

app.post("/signup", (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    username: req.body.username,
    fullName: req.body.fullName,
    userType: "user",
  };

  const newCart = {
    username: req.body.username,
    books: [],
  };

  const { valid, errors } = validateSignUpData(newUser);

  if (!valid) return res.status(400).json(errors);

  //capitalise user's full name
  newUser.fullName = capitaliseName(newUser.fullName);

  //set all letters in username to lowercase
  newUser.username = newUser.username.toLowerCase();

  //check if username already exists before registering user (email will be taken care of by firebase)
  let token, userID;
  let tokens = {};
  db.doc(`/users/${newUser.username}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return res
          .status(400)
          .json({ username: "This username is already taken." });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    })
    .then((data) => {
      userID = data.user.uid;
      tokens.refreshToken = data.user.refreshToken;
      return data.user.getIdToken();
    })
    .then((idToken) => {
      token = idToken;
      tokens.idToken = token;
      const userCredentials = {
        username: newUser.username,
        email: newUser.email,
        createdAt: new Date().getTime(),
        userID,
        fullName: newUser.fullName,
        history: "",
        userType: newUser.userType,
      };

      //create a new document for the user under the 'users' collection using the data recieved
      return db.doc(`/users/${newUser.username}`).set(userCredentials);
    })
    .then(() => {
      //   firebase
      //     .auth()
      //     .currentUser.sendEmailVerification()
      //     .then(() => {
      // });
      return db.doc(`/cart/${req.body.username}`).set(newCart);
    })
    .then(() => {
      return res.status(201).json(tokens);
    })
    .catch((error) => {
      console.error(error);
      //handle the email error from firebase
      if (error.code === "auth/email-already-in-use") {
        return res.status(400).json({ email: "Email is already in use." });
      } else {
        return res
          .status(500)
          .json({ general: "Something went wrong, please try again" });
      }
    });
});

//login
app.post("/login", (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
  };

  const { valid, errors } = validateLogInData(user);

  if (!valid) return res.status(400).json(errors);

  let tokens = {};

  //sign in user
  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then((data) => {
      //console.log("refresh token: ", data.user.refreshToken);
      tokens.refreshToken = data.user.refreshToken;
      return data.user.getIdToken();
    })
    .then((token) => {
      //console.log("idtoken: ", token);
      tokens.idToken = token;
      //console.log("tokens object: ", tokens);
      return res.json(tokens);
    })
    .catch((error) => {
      console.error(error);
      return res
        .status(400)
        .json({ general: "Invalid user credentials, please try again" });
    });
});

//check stock
app.post("/get-stock", (req, res) => {
  const stockDocument = db.doc(`/books/${req.body.bookID}`);

  stockDocument
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Book not found" });
      }
      book = doc.data();
      book.bookID = doc.id;
      return res.json(book);
    })
    .catch((error) => {
      console.error(error);
    });
});

//update price
app.post("/update-stock-price", (req, res) => {
  const newPrice = {
    price: req.body.price,
  };

  const { valid, errors } = validatePrice(req.body.price);

  if (!valid) return res.status(400).json(errors);

  db.doc(`/books/${req.body.bookID}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Book not found" });
      }
      db.doc(`/books/${req.body.bookID}`)
        .update(newPrice)
        .then(() => {
          //book updated
        });
    })
    .then(() => {
      return res.json({ message: "Price updated successfully" });
    })
    .catch((error) => {
      console.error(error);
      return res.status(500).json({ error: error.code });
    });
});

//delete stock
app.delete("/stock", (req, res) => {
  const stockDocument = db.doc(`/books/${req.body.bookID}`);

  stockDocument
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Book not found" });
      }
      return stockDocument.delete();
    })
    .then(() => {
      res.json({ message: "Book deleted successfully" });
    })
    .catch((error) => {
      console.error(error);
      return res.status(500).json({ error: error.code });
    });
});

//submit book review
//each review: review data, username, created at, bookID
app.post("/review", (req, res) => {
  const review = {
    data: req.body.data,
    username: req.body.username,
    createdAt: new Date().getTime(),
    bookID: req.body.bookID,
  };

  const { valid, errors } = validateReview(req.body.data);

  if (!valid) return res.status(400).json(errors);

  db.collection("reviews")
    .add(review)
    .then((doc) => {
      return res.json({ message: `${doc.id} review created successfully` });
    })
    .catch((error) => {
      console.error(error);
    });
});

//get first 3 review to display on main page
app.get("/review-overall", (req, res) => {
  db.collection("reviews")
    .limit(3)
    .get()
    .then((data) => {
      let reviewGeneral = [];
      data.forEach((doc) => {
        reviewGeneral.push(doc.data());
      });
      return res.json(reviewGeneral);
    })
    .catch((error) => {
      return res.status(500).json({ error: "Something went wrong" });
    });
});

//add to cart
//cart collection -> each document has username in it
//one collection has one username
//if there is a collection available for the particular username
//use that collection and update the data inside
//if there isnt, create a new collection and add the data inside
app.post("/cart", (req, res) => {
  const cartDocument = db.doc(`/cart/${req.body.username}`);

  cartDocument
    .get()
    .then((doc) => {
      let bookID = [];
      bookID = doc.data().books;
      bookID.push(req.body.bookID);
      db.doc(`/cart/${req.body.username}`)
        .update({
          books: bookID,
        })
        .then((doc) => {
          return res.json({ message: `Cart updated successfully` });
        });
    })
    .catch((error) => {
      console.error(error);
      return res.status(500).json({ error: "Something went wrong" });
    });
});

//add user history
app.post("/history", (req, res) => {
  const newHistory = {
    amount: req.body.amount,
    username: req.body.username,
    quantity: req.body.quantity,
    bookID: req.body.bookID,
    createdAt: new Date().getTime(),
    title: req.body.title,
    bookCover: req.body.bookCover,
  };

  db.collection("history")
    .add(newHistory)
    .then((doc) => {
      db.doc(`/cart/${req.body.username}`)
        .get()
        .then((doc) => {
          let tempBooksArray = doc.data().books;
          console.log(tempBooksArray);
          db.doc(`/cart/${req.body.username}`)
            .update({
              books: [],
            })
            .then(() => {
              //updated
              return res.json({ message: `History added successfully` });
            });
        });
    })
    .catch((error) => {
      console.error(error);
      return res.status(500).json({ error: `Something went wrong` });
    });
});

//image will be taken from req.body.albumID
app.post("/book/:bookID/cover", (req, res) => {
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  console.log("AAA");

  const busboy = new BusBoy({ headers: req.headers });

  let imageFileName;
  let imageToBeUploaded = {};

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      return res.status(400).json({ error: "Wrong file type submitted" });
    }

    const imageExtension = filename.split(".")[filename.split(".").length - 1];

    const randomNum = generateRandomNumber();

    imageFileName = `${randomNum}.${imageExtension}`;
    const filepath = path.join(os.tmpdir(), imageFileName);

    imageToBeUploaded = {
      filepath,
      mimetype,
    };

    file.pipe(fs.createWriteStream(filepath));
  });

  busboy.on("finish", () => {
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype,
          },
        },
      })
      .then(() => {
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
        return db
          .doc(`/books/${req.params.bookID}`)
          .update({ bookCover: imageUrl });
      })
      .then(() => {
        return res.json({ message: "Book cover uploaded successfully" });
      })
      .catch((error) => {
        console.error(error);
        return res.status(500).json({ error: error.code });
      });
  });
  busboy.end(req.rawBody);
});

//remove items from cart
app.post("/cart/delete", (req, res) => {
  db.doc(`/cart/${req.body.username}`)
    .get()
    .then((doc) => {
      let tempBooksArray = doc.data().books;
      const index = tempBooksArray.indexOf(req.body.bookID);
      if (index > -1) {
        // only splice array when item is found
        tempBooksArray.splice(index, 1); // 2nd parameter means remove one item only
      }

      db.doc(`/cart/${req.body.username}`)
        .update({
          books: tempBooksArray,
        })
        .then(() => {
          return res.json({ message: `Book removed from cart successfully` });
        });
    })
    .catch((error) => {
      console.error(error);
      return res.status(500).json({ error: `Something went wrong` });
    });
});

exports.api = functions.https.onRequest(app);
