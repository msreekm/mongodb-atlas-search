const { MongoClient, ObjectID } = require("mongodb");
const Express = require("express");
const Cors = require("cors");
const BodyParser = require("body-parser");
const { request } = require("express");

const atlas =
  "mongodb+srv://admin:admin@cluster0.psqes.mongodb.net/MLS?retryWrites=true&w=majority";
const client = new MongoClient(atlas, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
//const client = new MongoClient(atlas);
const server = Express();

server.use(BodyParser.json());
server.use(BodyParser.urlencoded({ extended: true }));
server.use(Cors());

var collection;

server.get("/address", async (request, response) => {
  try {
    let result = await collection
      .aggregate([
        {
          $search: {
            index: "address",
            autocomplete: {
              path: "full_address",
              query: `${request.query.address}`,
            },
          },
        },
        {
          $limit: 5,
        },
        {
          $project: {
            _id: 0,
            full_address: 1,
            grid_v2: 2,
          },
        },
      ])
      .toArray();
    response.send(result);
  } catch (e) {
    response.status(500).send({ message: e.message });
  }
});

//autocomplete locations
server.get("/cities", async (request, response) => {
  try {
    let result = await collection
      .aggregate([
        {
          $search: {
            index: "city",
            autocomplete: {
              path: "city",
              query: `${request.query.market}`,
            },
          },
        },
        {
          $limit: 10,
        },
        {
          $project: {
            _id: 0,
            city: 1,
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
  let markets = "";

  if (
    request.query.market1 !== "" &&
    request.query.market2 !== "" &&
    request.query.market3 !== ""
  ) {
    markets = `(city:${request.query.market1} OR city:${request.query.market2} OR city:${request.query.market3})`;
  } else if (request.query.market1 !== "" && request.query.market2 !== "") {
    markets = `(city:${request.query.market1} OR city:${request.query.market2})`;
  } else if (request.query.market1 !== "") {
    markets = `city:${request.query.market1}`;
  }

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
                    query: `${markets} AND cfs_property_type:${request.query.type}`,
                  },
                },
                {
                  range: {
                    path: "bedrooms",
                    gte: request.query.bed ? Number(request.query.bed) : 1,
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
                    lte: request.query.price ? Number(request.query.price) : 1,
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
server.get("/search", async (request, response) => {
  let markets = "";

  if (
    request.query.market1 !== "" &&
    request.query.market2 !== "" &&
    request.query.market3 !== ""
  ) {
    markets = `(city:${request.query.market1} OR city:${request.query.market2} OR city:${request.query.market3})`;
  } else if (request.query.market1 !== "" && request.query.market2 !== "") {
    markets = `(city:${request.query.market1} OR city:${request.query.market2})`;
  } else if (request.query.market1 !== "") {
    markets = `city:${request.query.market1}`;
  }

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
                    query: `${markets} AND cfs_property_type:${request.query.type}`,
                  },
                },
                {
                  range: {
                    path: "bedrooms",
                    gte: request.query.bed ? Number(request.query.bed) : 1,
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
                    lte: request.query.price ? Number(request.query.price) : 1,
                  },
                },
              ],
            },
          },
        },
        {
          $limit: 50,
        },
        {
          $project: {
            _id: 0,
            address1: 1,
            city: 2,
            state_or_province: 3,
            postal_cod: 4,
            bedrooms: 5,
            bathrooms: 6,
            square_feet: 7,
            list_price: 8,
            main_image_url: 9,
            grid_v2: 10,
            on_market_date: 11,
          },
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
