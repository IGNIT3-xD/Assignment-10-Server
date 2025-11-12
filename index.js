const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const admin = require("firebase-admin");
// const serviceAccount = require('./herohome-key.json');
const decoded = Buffer.from(process.env.FB_KEY, "base64").toString("utf8");
const serviceAccount = JSON.parse(decoded);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const app = express()
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

const verifyFbToken = async (req, res, next) => {
    const authorization = req.headers.authorization
    if (!authorization) {
        return res.status(401).send({ messege: 'Unauthorized Access' })
    }

    const token = authorization.split(' ')[1]
    if (!token) {
        return res.status(401).send({ messege: 'Unauthorized Access' })
    }

    try {
        await admin.auth().verifyIdToken(token)
        next()
    }
    catch {
        return res.status(401).send({ messege: 'Unauthorized Access' })
    }
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.apwz10b.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
})

app.get('/', (req, res) => {
    res.send('Server Running...')
})


async function run() {
    try {
        // await client.connect();
        const db = client.db('home_hero')
        const services = db.collection('services')
        const booking = db.collection('booking')
        const reviews = db.collection('reviews')

        // Home
        app.get('/top-services', async (req, res) => {
            const cursor = services.find().limit(6).sort({ rating: -1 })
            const result = await cursor.toArray()
            res.send(result)
        })

        // Services
        app.get('/services', async (req, res) => {

            const min = parseFloat(req.query.min) || 0;
            const max = parseFloat(req.query.max) || Infinity;

            const cursor = services.find({
                ratePerHour: { $gte: min, $lte: max }
            });
            const result = await cursor.toArray()
            res.send(result)
        })

        // Service details
        app.get('/services/:id', verifyFbToken, async (req, res) => {
            // console.log(req.params.id);
            const query = { _id: new ObjectId(req.params.id) }
            const result = await services.findOne(query)
            res.send(result)
        })

        // Get booking data from customer
        app.post('/booking', verifyFbToken, async (req, res) => {
            const newBooking = req.body
            const result = await booking.insertOne(newBooking)
            res.send(result)
        })

        // My bookings
        app.get('/booking', verifyFbToken, async (req, res) => {
            const email = req.query.email
            // console.log(email);
            const cursor = booking.find({ customer_email: email }).sort({ date: 1 })
            const result = await cursor.toArray()
            res.send(result)
        })

        // Delete booking
        app.delete('/booking/:id', verifyFbToken, async (req, res) => {
            const query = { _id: new ObjectId(req.params.id) }
            const result = await booking.deleteOne(query)
            res.send(result)
        })

        // Add services
        app.post('/services', verifyFbToken, async (req, res) => {
            const newService = req.body
            const result = await services.insertOne(newService)
            res.send(result)
        })

        // My services
        app.get('/my-services', verifyFbToken, async (req, res) => {
            const email = req.query.email
            // console.log(email);

            const cursor = services.find({ providerEmail: email })
            const result = await cursor.toArray()
            res.send(result)
        })

        // Delete service
        app.delete('/my-services/:id', verifyFbToken, async (req, res) => {
            const query = { _id: new ObjectId(req.params.id) }
            const result = await services.deleteOne(query)
            res.send(result)
        })

        // Update service
        app.patch('/my-services/:id', verifyFbToken, async (req, res) => {
            const query = { _id: new ObjectId(req.params.id) }
            const updatedService = req.body
            // console.log(updatedService);
            const update = {
                $set: updatedService
            }

            const result = await services.updateOne(query, update)
            res.send(result)
        })

        // Review and rating
        app.post('/reviews', verifyFbToken, async (req, res) => {
            const { serviceId, userEmail, userName, rating, comment } = req.body;
            // console.log(req.body);
            const newReview = {
                serviceId: new ObjectId(serviceId),
                userEmail,
                userName,
                rating,
                comment,
            };

            const result = await reviews.insertOne(newReview);

            const reviewsList = await reviews.find({ serviceId: new ObjectId(serviceId) }).toArray();
            const total = reviewsList.reduce((sum, r) => sum + r.rating, 0)
            const avgRating = total / reviewsList.length

            await services.updateOne(
                { _id: new ObjectId(serviceId) },
                { $set: { rating: avgRating } }
            )

            res.send(result)
        })

        // Get all reviews
        app.get('/reviews', verifyFbToken, async (req, res) => {
            const cursor = reviews.find()
            const result = await cursor.toArray()
            res.send(result)
        })

        // Get reviews by per service
        app.get('/reviews/:serviceId', verifyFbToken, async (req, res) => {
            const query = { serviceId: new ObjectId(req.params.serviceId) }
            // console.log(query);
            const result = await reviews.find(query).toArray()
            res.send(result)
        })

        // Filter search
        app.get('/search', async (req, res) => {
            const search = req.query.search
            const cursor = services.find({ serviceName: { $regex: search, $options: "i" } })
            const result = await cursor.toArray()
            res.send(result)
        })

        // Stats
        app.get('/my-stats', verifyFbToken, async (req, res) => {
            const email = req.query.email
            const myServices = await services.find({ providerEmail: email }).toArray()
            const myServicesIds = myServices.map(s => s._id.toString())

            const myBookings = await booking.find({ service_id: { $in: myServicesIds } }).toArray();
            res.send(myBookings)
        })

        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }
    finally {

    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

// hero_home
// eBXmsrtOaZv6mQ4e