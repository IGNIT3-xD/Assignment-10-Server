const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express()
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

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
        await client.connect();
        const db = client.db('home_hero')
        const services = db.collection('services')
        const booking = db.collection('booking')

        //Home
        app.get('/top-services', async (req, res) => {
            const cursor = services.find().limit(6).sort({ rating: -1 })
            const result = await cursor.toArray()
            res.send(result)
        })

        //Services
        app.get('/services', async (req, res) => {
            const cursor = services.find()
            const result = await cursor.toArray()
            res.send(result)
        })

        //Service details
        app.get('/services/:id', async (req, res) => {
            // console.log(req.params.id);
            const query = { _id: new ObjectId(req.params.id) }
            const result = await services.findOne(query)
            res.send(result)
        })

        //Get booking data from cutomer
        app.post('/booking', async (req, res) => {
            const newBooking = req.body
            const result = await booking.insertOne(newBooking)
            res.send(result)
        })

        //My bookings
        app.get('/booking', async (req, res) => {
            const email = req.query.email
            // console.log(email);
            const cursor = booking.find({ customer_email: email })
            const result = await cursor.toArray()
            res.send(result)
        })

        await client.db("admin").command({ ping: 1 });
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