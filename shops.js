let express = require("express");
let app = express();
app.use(express.json());
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Methods",
        "GEt, POST , OPTIONS, PUT, PATCH,DELETE,HEAD"
    );
    res.header(
        "Access-Control-Allow-Headers",
        "Origin,X-Requested-With,Content-Type,Accept"
    );
    next();
});
const port = 2410;
app.listen(port, () => console.log(`Node app listening on port ${port}!`));


const shopNameToIdMap = {};
const productNameToIdMap = {};



const { Client } = require("pg");
const client = new Client({
    user: "postgres",
    password: "Abhay7830928904",
    database: "postgres",
    port: 5432,
    host: "db.umomdwazywxixarejixy.supabase.co",
    ssl: { rejectUnauthorized: false },
});

client.connect(function (res, error) {
    console.log(`connected!!!`);
});



async function fetchShopAndProductData() {
    try {
        const shopQuery = 'SELECT * FROM shops';
        const productQuery = 'SELECT * FROM products';

        const [shopData, productData] = await Promise.all([
            client.query(shopQuery),
            client.query(productQuery),
        ]);

        shopData.rows.forEach((shop) => {
            shopNameToIdMap[`st${shop.shopId}`] = shop.shopId;
        });

        productData.rows.forEach((product) => {
            productNameToIdMap[product.productname] = `pr${product.productid}`;
        });
    } catch (error) {
        console.error('Error fetching shop and product data:', error);
    }
}

fetchShopAndProductData();

app.get('/purchase', async (req, res) => {
    const { shop, product, sort } = req.query;
    let query = 'SELECT * FROM purchases WHERE TRUE';
    const queryParams = [];

    if (shop) {
        const shopCriteria = shop.split(',');
        const shopIds = shopCriteria.map(criteria => {
            if (shopNameToIdMap[criteria]) {
                return shopNameToIdMap[criteria];
            } else if (/^st\d+$/.test(criteria)) {

                return parseInt(criteria.slice(2));
            } else {
                return criteria;
            }
        });
        queryParams.push(shopIds);
        query += ` AND shopId = ANY($${queryParams.length})`;
    }

    if (product) {
        const productCriteria = product.split(',');
        const productIds = productCriteria.map(criteria => {
            if (productNameToIdMap[criteria]) {
                return productNameToIdMap[criteria];
            } else if (/^pr\d+$/.test(criteria)) {

                return parseInt(criteria.slice(2));
            } else {
                return criteria;
            }
        });
        queryParams.push(productIds);
        query += ` AND productid = ANY($${queryParams.length})`;
    }

    if (sort) {
        const sortOptions = sort.split(",");
        const validSortColumns = ["QtyAsc", "QtyDesc", "ValueAsc", "ValueDesc"];

        if (sortOptions.some(option => !validSortColumns.includes(option))) {
            return res.status(400).json({ error: "Invalid sort options provided." });
        }

        if (sortOptions.includes("QtyAsc")) {
            query += " ORDER BY quantity ASC";
        } else if (sortOptions.includes("QtyDesc")) {
            query += " ORDER BY quantity DESC";
        } else if (sortOptions.includes("ValueAsc")) {
            query += " ORDER BY (price * quantity) ASC";
        } else if (sortOptions.includes("ValueDesc")) {
            query += " ORDER BY (price * quantity) DESC";
        }
    }

    try {
        const { rows } = await client.query(query, queryParams);
        res.json(rows);
    } catch (error) {
        console.error("Error retrieving purchases:", error);
        res.status(500).json({ error: "An error occurred while retrieving purchases." });
    }
});


app.get("/shops", function (req, res, next) {
    console.log("Inside /users get api");
    const query = `select * from shops`;
    client.query(query, function (err, result) {
        if (err) {
            res.status(400).send(err);
        } else res.send(result.rows);

    });
});
app.get("/shops/:id", function (req, res, next) {
    const { id } = req.params;
    console.log("Inside /shops/:id get api");
    const query = 'SELECT * FROM shops WHERE shopid = $1';
    client.query(query, [id], function (err, result) {
        if (err) {
            console.error("Error retrieving shops:", err);
            res.status(500).json({ error: "An error occurred while retrieving purchases." });
        } else {
            res.json(result.rows);
        }
    });
});

app.post("/shops", (req, res, next) => {
    const { name, rent } = req.body;

    client.query(
        "INSERT INTO shops (name,rent) VALUES ($1, $2)",
        [name, rent],
        (err, results) => {
            if (err) {
                console.error("Error adding shops", err);
                res.status(500).json({ error: "Internal Server Error" });
                return;
            }
            res.send(`${results.rowCount} insertion successfull`);
        }
    );
});

app.get("/products", function (req, res, next) {
    console.log("Inside /users get api");
    const query = `select * from products`;
    client.query(query, function (err, result) {
        if (err) {
            res.status(400).send(err);
        } else res.send(result.rows);

    });
});
app.get("/products/:id", function (req, res, next) {
    const { id } = req.params;
    console.log("Inside /products/:id get api");
    const query = 'SELECT * FROM products WHERE productid = $1';
    client.query(query, [id], function (err, result) {
        if (err) {
            console.error("Error retrieving products:", err);
            res.status(500).json({ error: "An error occurred while retrieving purchases." });
        } else {
            res.json(result.rows);
        }
    });
});

app.post("/products", (req, res, next) => {
    const { productname, category, description } = req.body;

    client.query(
        "INSERT INTO products (productname,category,description) VALUES ($1, $2, $3)",
        [productname, category, description],
        (err, results) => {
            if (err) {
                console.error("Error adding shops", err);
                res.status(500).json({ error: "Internal Server Error" });
                return;
            }
            res.send(`${results.rowCount} insertion successfull`);
        }
    );
});

app.put("/products/:productid", (req, res, next) => {
    const { productid } = req.params;
    const { productname, category, description } = req.body;
    client.query(
        "UPDATE products SET productname = $1, category = $2,  description  = $3 WHERE productid =$4",
        [productname, category, description, productid],
        (err, result) => {
            if (err) {
                console.error("Error updating products:", err);
                res.status(500).json({ error: "Internal Server Error" });
                return;
            }
            res.send(`${result.rowCount} updation successful`);
        });
});





app.get("/purchase/:id", function (req, res, next) {
    const { id } = req.params;
    console.log("Inside /purchase/:id get api");
    const query = 'SELECT * FROM purchases WHERE purchaseid = $1';
    client.query(query, [id], function (err, result) {
        if (err) {
            console.error("Error retrieving purchases:", err);
            res.status(500).json({ error: "An error occurred while retrieving purchases." });
        } else {
            res.json(result.rows);
        }
    });
});


app.get("/purchase/shops/:id", function (req, res, next) {
    const { id } = req.params;
    console.log("Inside /purchase/shops/:id get api");
    const query = 'SELECT * FROM purchases WHERE shopId = $1';
    client.query(query, [id], function (err, result) {
        if (err) {
            console.error("Error retrieving purchases:", err);
            res.status(500).json({ error: "An error occurred while retrieving purchases." });
        } else {
            res.json(result.rows);
        }
    });
});
app.get("/purchase/product/:id", function (req, res, next) {
    const { id } = req.params;
    console.log("Inside /purchase/product/:id get api");
    const query = 'SELECT * FROM purchases WHERE productId = $1';
    client.query(query, [id], function (err, result) {
        if (err) {
            console.error("Error retrieving purchases:", err);
            res.status(500).json({ error: "An error occurred while retrieving purchases." });
        } else {
            res.json(result.rows);
        }
    });
});


app.get("/totalPurchase/shop/:id", function (req, res, next) {
    const { id } = req.params;
    console.log("Inside /totalpurchase/shops/:id get api");
    const query = 'SELECT productid, SUM(quantity) as totalQuantity, SUM(price * quantity) as totalValue FROM purchases WHERE shopId = $1 GROUP BY productid';
    client.query(query, [id], function (err, result) {
        if (err) {
            console.error("Error retrieving purchases:", err);
            res.status(500).json({ error: "An error occurred while retrieving purchases." });
        } else {
            res.json(result.rows);
        }
    });
});

app.get("/totalPurchase/product/:id", function (req, res, next) {
    const { id } = req.params;
    console.log("Inside /totalpurchase/product/:id get api");
    const query = 'SELECT shopId, SUM(quantity) as totalQuantity, SUM(price * quantity) as totalValue FROM purchases WHERE productid = $1 GROUP BY shopId';
    client.query(query, [id], function (err, result) {
        if (err) {
            console.error("Error retrieving purchases:", err);
            res.status(500).json({ error: "An error occurred while retrieving purchases." });
        } else {
            res.json(result.rows);
        }
    });
});


app.post("/purchase", (req, res, next) => {
    const { shopid, productid, price, quantity } = req.body;

    client.query(
        "INSERT INTO purchases (shopid, productid, price,quantity) VALUES ($1, $2, $3, $4)",
        [shopid, productid, price, quantity],
        (err, results) => {
            if (err) {
                console.error("Error adding shops", err);
                res.status(500).json({ error: "Internal Server Error" });
                return;
            }
            res.send(`${results.rowCount} insertion successfull`);
        }
    );
});