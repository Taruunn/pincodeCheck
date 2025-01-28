import fetch from "node-fetch";

export async function handler(event) {
  const { pincode, productId } = event.queryStringParameters;

  if (!pincode || !productId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing pincode or productId" }),
    };
  }

  const SHOPIFY_API_URL = "https://blue-city-store.myshopify.com/admin/api/2023-01/graphql.json";
  const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;

  const query = `
    query GetProductInventory($productId: ID!) {
      product(id: $productId) {
        title
        variants(first: 10) {
          edges {
            node {
              inventoryItem {
                inventoryLevels(first: 10) {
                  edges {
                    node {
                      available
                      location {
                        name
                        address {
                          city
                          postalCode
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(SHOPIFY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_API_KEY,
      },
      body: JSON.stringify({ query, variables: { productId } }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: result.errors || "Error fetching inventory" }),
      };
    }

    const matchedLocation = result.data.product.variants.edges[0].node.inventoryItem.inventoryLevels.edges.find(
      (level) => level.node.location.address.postalCode.startsWith(pincode.slice(0, 3))
    );

    if (!matchedLocation) {
      return {
        statusCode: 200,
        body: JSON.stringify({ error: "No warehouse matches the given pincode." }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        warehouse: matchedLocation.node.location.name,
        available: matchedLocation.node.available,
        city: matchedLocation.node.location.address.city,
        estimatedDelivery: "2-3 days",
      }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error" }),
    };
  }
}
