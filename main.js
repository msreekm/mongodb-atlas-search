const { MongoClient, ObjectID } = require("mongodb");
const Express = require("express");
const Cors = require("cors");
const BodyParser = require("body-parser");
const { request } = require("express");

const atlas =
  "mongodb+srv://admin:admin@cluster0.psqes.mongodb.net/MLS?retryWrites=true&w=majority";
const client =  new MongoClient(atlas,{ useNewUrlParser: true,useUnifiedTopology: true});
//const client = new MongoClient(atlas);
const server = Express();

server.use(BodyParser.json());
server.use(BodyParser.urlencoded({ extended: true }));
server.use(Cors());

var collection;

server.get("/search", async (request, response) => {
  try {
    let result = await collection
      .aggregate([
        {
          $search: {
            index: "default",
            text: {
              query: `${request.query.market}`,
              path: "city",
              fuzzy: {
                maxEdits: 2, //how many consecutive characters must match
                prefixLength: 3, //number of characters at the beginning of each term in the result that must match exactly
              },
            },
          },
        },
      ])
      .toArray();
    response.send(result);
  } catch (e) {
    response.status(500).send({ message: e.message });
  }
});
server.get("/count", async (request, response) => {
  try {
    let result = await collection
      .aggregate([
        {
          $search: {
            index: "custom",
            compound: {
              must: [
                {
                  queryString: {
                    defaultPath: "city",
                    query: `city:${request.query.market}  AND property_sub_type:"Single Family Residence"`,
                  },
                },
                {
                  range: {
                    path: "bedrooms",
                    lte: request.query.bed ? Number(request.query.bed) : 1,
                  },
                },
                {
                  range: {
                    path: "bathrooms",
                    gte: request.query.bath ? Number(request.query.bath) : 1,
                  },
                },
                {
                  range: {
                    path: "list_price",
                    gte: request.query.price ? Number(request.query.price) : 1,
                  },
                },
              ],
            },
          },
        },
        {
          $count: "property_count",
        },
      ])
      .toArray();
    response.send(result);
  } catch (e) {
    response.status(500).send({ message: e.message });
  }
});
server.get("/get/:id", async (request, response) => {
  try {
    let result = await collection.findOne({ _id: ObjectID(request.params.id) });
    response.send(result);
  } catch (e) {
    response.status(500).send({ message: e.message });
  }
});

server.listen(process.env.PORT || "3000", async () => {
  try {
    await client.connect();
    collection = client.db("MLS").collection("Property");
  } catch (e) {
    console.error(e);
  }
});
