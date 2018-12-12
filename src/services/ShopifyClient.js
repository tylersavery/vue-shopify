import axios from 'axios';
import GraphSql from './GraphSQL'

export default class ShopifyClient {
    constructor(shopifyDomain, shopifyToken) {

        this.shopifyDomain = shopifyDomain;
        this.shopifyToken = shopifyToken;

        this.graphSql = new GraphSql()
        
    }

    query(gsqlData, successCallback, errorCallback) {
        let config = {
            headers: {
                "X-Shopify-Storefront-Access-Token": this.shopifyToken,
                "content-Type": "application/graphql"
            }
        }

        axios.post("https://" + this.shopifyDomain + "/api/graphql", gsqlData, config)
            .then(successResponse => {
                successCallback(successResponse)
            })
            .catch(errorResponse => {
                console.log("Error", errorResponse)
                errorCallback(errorResponse)
            })
    }

    createCheckoutId(successCallback, errorCallback) {
        let query = this.graphSql.createCheckoutIdQuery()
        this.query(query, responseSuccess => {
            console.log(responseSuccess)
            let checkoutId = responseSuccess.data.data.checkoutCreate.checkout.id
            successCallback(checkoutId)
        }, responseError => {
            errorCallback(responseError)
        })
    }

    getCart(checkoutId, successCallback, errorCallback) {
        let query = this.graphSql.cartQuery(checkoutId)
        this.query(query, responseSuccess => {

            console.log('success', responseSuccess)

            let lineItems = responseSuccess.data.data.node.lineItems.edges;

            let normalizedLineItems = [];
            let count = 0;
            let totalPrice = 0;
            for(let l of lineItems){

                console.log("lineitem:", l)

                let subtotal = parseFloat(l.node.variant.price) * parseInt(l.node.quantity)

                let image = l.node.variant.image.src

                let lineItem = {
                    id: l.node.id,
                    variantId: l.node.variant.id,
                    title: l.node.title,
                    quantity: l.node.quantity,
                    image: image,
                    price: this._formatCurrency(l.node.variant.price),
                    variantTitle: this._shortenVariantTitle(l.node.variant.title),
                    description: l.node.description,
                    totalPrice: this._formatCurrency(subtotal)
                }

                count += parseInt(l.node.quantity)
                totalPrice += subtotal

                normalizedLineItems.push(lineItem)
            }
            
            let cart = {
                count: count,
                lineItems: normalizedLineItems,
                totalPrice: this._formatCurrency(totalPrice),
                checkoutUrl: responseSuccess.data.data.node.webUrl
            }
            
            successCallback(cart)
        }, responseError => {
            errorCallback(responseError)
        })
    }

    removeFromCart(lineItemId, checkoutId, successCallback, errorCallback){
        let query = this.graphSql.removeFromCartQuery(lineItemId, checkoutId)
        this.query(query, responseSuccess => {
            successCallback(responseSuccess)
        }, responseError => {
            errorCallback(responseError)
        })
    }

    updateQuantity(lineItemId, variantId, quantity, checkoutId, successCallback, errorCallback) {
        let query = this.graphSql.updateQuantityQuery(lineItemId, variantId, quantity, checkoutId)
        this.query(query, responseSuccess => {
            successCallback(responseSuccess)
        }, responseError => {
            errorCallback(responseError)
        })
    }

    _normalizeProduct(p){
        let images = []
      
        for(let img of p.node.images.edges){
            images.push(img.node.src)
        }
    
        let variants = []
        for(let v of p.node.variants.edges) {
            let variant = {
                id: v.node.id,
                image: v.node.image.src,
                price: v.node.price,
                title: this._shortenVariantTitle(v.node.title),
                availableForSale: v.node.availableForSale
            }
            variants.push(variant)
        }

        let price = p.price ? p.price : variants[0].price
        price = price.replace('.00', '')

        let product = {
            id: p.node.id,
            description: p.node.description != "" ? p.node.description : null,
            title: p.node.title,
            price: price,
            images: images,
            selectedImage: images[0],
            variants: variants,
            availableForSale: p.node.availableForSale
        }

        return product
    }

    _formatCurrency(num) {
        return parseFloat(num).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
    }

    _shortenVariantTitle(title) {
        title = title.toUpperCase()
        switch(title) {
            case "SMALL":
                return "S"
            case "MEDIUM":
                return "M"
            case "LARGE":
                return "L"
            case "X-LARGE":
                return "XL"
            case "XX-LARGE":
                return "XXL"
        }

        return title
    }

    allProducts(successCallback, errorCallback) {
        let query = this.graphSql.allProductsQuery();
        this.query(query, responseSuccess => {
            let products = responseSuccess.data.data.shop.products.edges;
            let normalizedProducts = [];
            for(let p of products) {
                let normalizedProduct = this._normalizeProduct(p)
                normalizedProducts.push(normalizedProduct)
                
            }
            successCallback(normalizedProducts)
        }, responseError => {
            errorCallback(responseError);
        })

    }

    productsFromCollection(collectionHandle, successCallback, errorCallback) {
        let query = this.graphSql.productsFromCollectionQuery(collectionHandle);

        this.query(query, responseSuccess => {
            let products = responseSuccess.data.data.shop.collectionByHandle.products.edges;
            let normalizedProducts = [];
            for(let p of products) {
                
                let normalizedProduct = this._normalizeProduct(p)
                normalizedProducts.push(normalizedProduct)
            }
            successCallback(normalizedProducts)
        }, responseError => {
            errorCallback(responseError);
        })

    }


    productDetails(productId, successCallback, errorCallback) {
        let query = this.graphSql.productDetailsQuery(productId)
        this.query(query, responseSuccess => {
            console.log("PRODUCT DETAIL", responseSuccess)
            let normalizedProduct = this._normalizeProduct(responseSuccess.data.data);
            successCallback(normalizedProduct)
        }, responseError => {
            errorCallback(responseError)
        })
    }

    addToCart(variantId, checkoutId, successCallback, errorCallback) {
        let query = this.graphSql.addToCartQuery(variantId, checkoutId)
        this.query(query, responseSuccess => {
            successCallback(responseSuccess)
        }, responseError => {
            errorCallback(responseError)
        })
    }
}