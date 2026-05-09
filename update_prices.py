import re

# Read the mockStores.ts file
with open('app/src/lib/data/mockStores.ts', 'r') as f:
    content = f.read()

# Count before
before_prices = re.findall(r'"priceUsdc":\s*([0-9.]+)', content)
print(f"Found {len(before_prices)} prices to update")
print(f"Sample prices before: {before_prices[:5]}")

# Replace all priceUsdc values with 8.00
content_updated = re.sub(
    r'"priceUsdc":\s*[0-9.]+',
    '"priceUsdc": 8.00',
    content
)

# Replace all moq values with 1
content_updated = re.sub(
    r'"moq":\s*[0-9]+',
    '"moq": 1',
    content_updated
)

# Verify the changes
after_prices = re.findall(r'"priceUsdc":\s*([0-9.]+)', content_updated)
after_moq = re.findall(r'"moq":\s*([0-9]+)', content_updated)

print(f"\nSample prices after: {after_prices[:5]}")
print(f"All prices are 8.00: {all(p == '8.00' for p in after_prices)}")
print(f"All MOQ are 1: {all(m == '1' for m in after_moq)}")

# Write back
with open('app/src/lib/data/mockStores.ts', 'w') as f:
    f.write(content_updated)

print("\n✓ Updated mockStores.ts with:")
print("  - All product prices → 8.00 USDC")
print("  - All MOQ values → 1")
print(f"  - Total products updated: {len(before_prices)}")
