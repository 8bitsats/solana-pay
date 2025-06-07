# browser_use_alice.py - Browser-Use API Integration for Alice AI Shopping Assistant
# This demonstrates how Alice AI can use Browser-Use to automate web purchases

import os
import json
import time
import asyncio
import requests
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from datetime import datetime
from pydantic import BaseModel

# Configuration
API_KEY = os.getenv('BROWSER_USE_API_KEY')
BASE_URL = 'https://api.browser-use.com/api/v1'
HEADERS = {'Authorization': f'Bearer {API_KEY}'}

# Data Models
@dataclass
class Product:
    name: str
    price: float
    url: str
    description: str
    in_stock: bool

class PurchaseResult(BaseModel):
    success: bool
    order_id: Optional[str] = None
    total_paid: Optional[float] = None
    error_message: Optional[str] = None
    delivery_date: Optional[str] = None

class SearchResult(BaseModel):
    products: List[Dict[str, Any]]
    search_time: float
    total_results: int

# Browser-Use Client
class BrowserUseClient:
    """Client for interacting with Browser-Use API"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = BASE_URL
        self.headers = {'Authorization': f'Bearer {api_key}'}
    
    def create_task(self, instructions: str, structured_output: Optional[Dict] = None) -> str:
        """Create a new browser automation task"""
        payload = {'task': instructions}
        
        if structured_output:
            payload['structured_output_json'] = json.dumps(structured_output)
        
        response = requests.post(
            f'{self.base_url}/run-task',
            headers=self.headers,
            json=payload
        )
        response.raise_for_status()
        return response.json()['id']
    
    def get_task_details(self, task_id: str) -> Dict[str, Any]:
        """Get full task details including output"""
        response = requests.get(
            f'{self.base_url}/task/{task_id}',
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def wait_for_completion(self, task_id: str, poll_interval: int = 2, timeout: int = 120) -> Dict[str, Any]:
        """Poll task status until completion"""
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            details = self.get_task_details(task_id)
            status = details.get('status')
            
            print(f"Task status: {status}")
            
            if status == 'finished':
                return {'success': True, 'output': details.get('output')}
            elif status in ['failed', 'stopped']:
                return {'success': False, 'error': details.get('error', 'Task failed')}
            
            # Print current step if available
            steps = details.get('steps', [])
            if steps:
                current_step = steps[-1]
                print(f"Current step: {current_step.get('next_goal', 'Processing...')}")
            
            time.sleep(poll_interval)
        
        return {'success': False, 'error': 'Task timeout'}
    
    def stop_task(self, task_id: str) -> Dict[str, Any]:
        """Stop a running task"""
        response = requests.put(
            f'{self.base_url}/stop-task?task_id={task_id}',
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

# Alice Shopping Assistant
class AliceShoppingAssistant:
    """AI Shopping Assistant that uses Browser-Use for web automation"""
    
    def __init__(self, browser_client: BrowserUseClient):
        self.browser = browser_client
        self.search_history = []
        self.purchase_history = []
    
    async def search_products(self, query: str, max_results: int = 5) -> SearchResult:
        """Search for products across multiple e-commerce sites"""
        print(f"🔍 Alice: Searching for '{query}'...")
        
        # Create structured output schema for search results
        search_schema = {
            "type": "object",
            "properties": {
                "products": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "price": {"type": "number"},
                            "url": {"type": "string"},
                            "description": {"type": "string"},
                            "rating": {"type": "number"},
                            "in_stock": {"type": "boolean"}
                        }
                    }
                },
                "total_results": {"type": "integer"}
            }
        }
        
        # Search instructions for Browser-Use
        instructions = f"""
        Search for "{query}" on Amazon and other major shopping sites.
        For each product found:
        1. Extract the product name, price, URL, and description
        2. Check if it's in stock
        3. Get the rating if available
        Return the top {max_results} results.
        """
        
        start_time = time.time()
        
        try:
            # Create search task
            task_id = self.browser.create_task(instructions, search_schema)
            print(f"📋 Task created: {task_id}")
            
            # Wait for results
            result = self.browser.wait_for_completion(task_id)
            
            if result['success']:
                output = json.loads(result['output']) if isinstance(result['output'], str) else result['output']
                search_time = time.time() - start_time
                
                search_result = SearchResult(
                    products=output.get('products', []),
                    search_time=search_time,
                    total_results=output.get('total_results', len(output.get('products', [])))
                )
                
                # Save to history
                self.search_history.append({
                    'query': query,
                    'timestamp': datetime.now().isoformat(),
                    'results_count': len(search_result.products)
                })
                
                return search_result
            else:
                print(f"❌ Search failed: {result.get('error')}")
                return SearchResult(products=[], search_time=0, total_results=0)
                
        except Exception as e:
            print(f"❌ Error during search: {str(e)}")
            return SearchResult(products=[], search_time=0, total_results=0)
    
    async def compare_prices(self, product_name: str) -> List[Product]:
        """Compare prices for a specific product across multiple sites"""
        print(f"💰 Alice: Comparing prices for '{product_name}'...")
        
        comparison_schema = {
            "type": "object",
            "properties": {
                "comparisons": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "store": {"type": "string"},
                            "price": {"type": "number"},
                            "shipping": {"type": "number"},
                            "total": {"type": "number"},
                            "url": {"type": "string"},
                            "availability": {"type": "string"}
                        }
                    }
                }
            }
        }
        
        instructions = f"""
        Compare prices for "{product_name}" across:
        1. Amazon
        2. Best Buy
        3. Walmart
        4. Target
        For each store, get the price, shipping cost, and availability.
        """
        
        try:
            task_id = self.browser.create_task(instructions, comparison_schema)
            result = self.browser.wait_for_completion(task_id)
            
            if result['success']:
                output = json.loads(result['output']) if isinstance(result['output'], str) else result['output']
                comparisons = output.get('comparisons', [])
                
                # Convert to Product objects
                products = []
                for comp in comparisons:
                    products.append(Product(
                        name=product_name,
                        price=comp['total'],
                        url=comp['url'],
                        description=f"From {comp['store']} - {comp['availability']}",
                        in_stock='in stock' in comp['availability'].lower()
                    ))
                
                return sorted(products, key=lambda p: p.price)
            else:
                return []
                
        except Exception as e:
            print(f"❌ Error comparing prices: {str(e)}")
            return []
    
    async def purchase_product(self, product_url: str, user_info: Dict[str, str]) -> PurchaseResult:
        """Complete a purchase for a product"""
        print(f"🛒 Alice: Initiating purchase from {product_url}")
        
        purchase_schema = {
            "type": "object",
            "properties": {
                "success": {"type": "boolean"},
                "order_id": {"type": "string"},
                "total_paid": {"type": "number"},
                "delivery_date": {"type": "string"},
                "error_message": {"type": "string"}
            }
        }
        
        instructions = f"""
        Complete purchase at {product_url}:
        1. Add item to cart
        2. Proceed to checkout
        3. Use guest checkout if available
        4. Fill shipping information:
           - Name: {user_info.get('name')}
           - Address: {user_info.get('address')}
           - Email: {user_info.get('email')}
        5. Use stored payment method or enter test card
        6. Complete the purchase
        7. Extract order ID and delivery date
        """
        
        try:
            # Safety check - confirm with user
            print("⚠️  Purchase automation initiated - this would complete a real purchase in production")
            
            task_id = self.browser.create_task(instructions, purchase_schema)
            result = self.browser.wait_for_completion(task_id, timeout=180)
            
            if result['success']:
                output = json.loads(result['output']) if isinstance(result['output'], str) else result['output']
                
                purchase_result = PurchaseResult(
                    success=output.get('success', False),
                    order_id=output.get('order_id'),
                    total_paid=output.get('total_paid'),
                    delivery_date=output.get('delivery_date'),
                    error_message=output.get('error_message')
                )
                
                # Save to history
                if purchase_result.success:
                    self.purchase_history.append({
                        'order_id': purchase_result.order_id,
                        'amount': purchase_result.total_paid,
                        'timestamp': datetime.now().isoformat(),
                        'url': product_url
                    })
                
                return purchase_result
            else:
                return PurchaseResult(
                    success=False,
                    error_message=result.get('error', 'Purchase failed')
                )
                
        except Exception as e:
            print(f"❌ Error during purchase: {str(e)}")
            return PurchaseResult(success=False, error_message=str(e))
    
    async def track_order(self, order_id: str, store_url: str) -> Dict[str, Any]:
        """Track an existing order"""
        print(f"📦 Alice: Tracking order {order_id}")
        
        tracking_schema = {
            "type": "object",
            "properties": {
                "status": {"type": "string"},
                "location": {"type": "string"},
                "estimated_delivery": {"type": "string"},
                "tracking_number": {"type": "string"}
            }
        }
        
        instructions = f"""
        Go to {store_url} and track order {order_id}:
        1. Find order tracking page
        2. Enter order ID: {order_id}
        3. Get current status, location, and delivery estimate
        """
        
        try:
            task_id = self.browser.create_task(instructions, tracking_schema)
            result = self.browser.wait_for_completion(task_id)
            
            if result['success']:
                return json.loads(result['output']) if isinstance(result['output'], str) else result['output']
            else:
                return {"error": "Could not track order"}
                
        except Exception as e:
            return {"error": str(e)}
    
    def get_shopping_summary(self) -> Dict[str, Any]:
        """Get a summary of Alice's shopping activity"""
        total_spent = sum(p['amount'] for p in self.purchase_history if 'amount' in p)
        
        return {
            "searches_performed": len(self.search_history),
            "purchases_made": len(self.purchase_history),
            "total_spent": total_spent,
            "last_search": self.search_history[-1] if self.search_history else None,
            "last_purchase": self.purchase_history[-1] if self.purchase_history else None
        }

# Example usage and demo
async def demo_alice_shopping():
    """Demo of Alice AI Shopping Assistant"""
    
    # Initialize Browser-Use client
    browser_client = BrowserUseClient(API_KEY)
    
    # Create Alice assistant
    alice = AliceShoppingAssistant(browser_client)
    
    print("👋 Hello! I'm Alice, your AI shopping assistant!")
    print("I can search products, compare prices, and even complete purchases for you.\n")
    
    # Example 1: Search for products
    print("Example 1: Searching for wireless headphones")
    search_results = await alice.search_products("wireless noise cancelling headphones", max_results=3)
    
    if search_results.products:
        print(f"\n✅ Found {len(search_results.products)} products in {search_results.search_time:.2f} seconds:")
        for i, product in enumerate(search_results.products, 1):
            print(f"\n{i}. {product['name']}")
            print(f"   Price: ${product['price']}")
            print(f"   Rating: {product.get('rating', 'N/A')}/5")
            print(f"   In Stock: {'Yes' if product.get('in_stock') else 'No'}")
    
    # Example 2: Compare prices
    print("\n\nExample 2: Comparing prices for a specific product")
    if search_results.products:
        first_product = search_results.products[0]['name']
        price_comparison = await alice.compare_prices(first_product)
        
        if price_comparison:
            print(f"\n💰 Price comparison for '{first_product}':")
            for product in price_comparison:
                print(f"  {product.description}: ${product.price}")
    
    # Example 3: Purchase simulation (with safety check)
    print("\n\nExample 3: Purchase simulation")
    print("⚠️  Note: This is a demo - no real purchase will be made")
    
    demo_user_info = {
        'name': 'Alice Demo User',
        'address': '123 Demo St, Test City, TC 12345',
        'email': 'alice@demo.com'
    }
    
    # Simulate purchase (commented out for safety)
    # purchase_result = await alice.purchase_product(
    #     "https://example.com/product",
    #     demo_user_info
    # )
    
    # Get shopping summary
    print("\n\n📊 Shopping Summary:")
    summary = alice.get_shopping_summary()
    print(f"  Searches performed: {summary['searches_performed']}")
    print(f"  Purchases made: {summary['purchases_made']}")
    print(f"  Total spent: ${summary['total_spent']:.2f}")

# Utility functions for X402 integration
def create_x402_payment_task(amount: float, token: str, recipient: str) -> Dict[str, Any]:
    """Create a Browser-Use task for X402 payment completion"""
    
    payment_schema = {
        "type": "object",
        "properties": {
            "payment_completed": {"type": "boolean"},
            "transaction_hash": {"type": "string"},
            "amount_paid": {"type": "number"},
            "token_used": {"type": "string"}
        }
    }
    
    instructions = f"""
    Complete X402 payment:
    1. Connect to Phantom wallet
    2. Send {amount} {token} to {recipient}
    3. Wait for transaction confirmation
    4. Extract transaction hash
    """
    
    client = BrowserUseClient(API_KEY)
    return client.create_task(instructions, payment_schema)

# Run the demo
if __name__ == "__main__":
    # Check if API key is set
    if not API_KEY:
        print("❌ Please set BROWSER_USE_API_KEY environment variable")
        exit(1)
    
    # Run the demo
    asyncio.run(demo_alice_shopping())