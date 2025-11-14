# Test Data Files

This directory contains test data files used by the Robot Framework acceptance tests.

## Required Test Data

### Images

You'll need to provide the following test images for running the full test suite:

1. **test_product.jpg**
   - A valid JPEG image (recommended: 1024x768 or larger)
   - Used for product image upload tests
   - Should be under 5MB

2. **large_test_image.jpg**
   - A larger JPEG image (recommended: 2-3MB)
   - Used for testing image optimization and processing
   - Should have EXIF metadata for testing metadata stripping

### Creating Test Images

You can use any image editing tool or download sample images:

```bash
# Download sample images from a free stock photo site
# Or create placeholder images using ImageMagick:
convert -size 800x600 xc:blue test_product.jpg
convert -size 2000x1500 xc:green large_test_image.jpg
```

### Security Note

⚠️ **Do not commit actual product images or sensitive test data to version control.**

Use placeholder or synthetic images for testing purposes only.
