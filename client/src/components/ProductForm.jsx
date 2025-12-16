import { useEffect, useRef, useState } from 'react';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const toReadableFileSize = (bytes) => {
  if (!bytes) {
    return '0 B';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' }
];

const ProductForm = ({
  initialValues,
  onSubmit,
  isSubmitting,
  submitLabel,
  mode,
  categories,
  categoriesLoading,
  categoriesError
}) => {
  const [formValues, setFormValues] = useState(initialValues);
  const [formError, setFormError] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(initialValues?.imagePreviewUrl || '');
  const [imageFileName, setImageFileName] = useState('');
  const fileInputRef = useRef(null);
  const disableCategorySelection = categoriesLoading && (!(Array.isArray(categories) && categories.length > 0));

  useEffect(() => {
    setFormValues(initialValues);
    setImagePreviewUrl(initialValues?.imagePreviewUrl || '');
    setImageFile(null);
    setImageFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [initialValues]);

  const handleChange = (event) => {
    const { name, type, value, checked } = event.target;
    if (name === 'categoryIds' || name === 'primaryCategory') {
      return;
    }
    setFormValues((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePrimaryCategoryChange = (event) => {
    const selected = event.target.value;
    setFormValues((current) => {
      if (!selected) {
        return {
          ...current,
          categoryId: '',
          categoryIds: []
        };
      }

      const filtered = (current.categoryIds || []).filter((id) => id && id !== selected);
      return {
        ...current,
        categoryId: selected,
        categoryIds: [selected, ...filtered]
      };
    });
  };

  const handleCategorySelection = (event) => {
    const options = Array.from(event.target.selectedOptions || []);
    const selectedIds = options.map((option) => option.value).filter(Boolean);
    setFormValues((current) => ({
      ...current,
      categoryIds: selectedIds,
      categoryId: selectedIds[0] || ''
    }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setFormError('');

    if (!file) {
      setImageFile(null);
      setImagePreviewUrl(initialValues?.imagePreviewUrl || '');
      setImageFileName('');
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setFormError('Image must be JPEG, PNG, or WebP format.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setImageFile(null);
      setImagePreviewUrl(initialValues?.imagePreviewUrl || '');
      setImageFileName('');
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setFormError('Image must be 5MB or smaller.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setImageFile(null);
      setImagePreviewUrl(initialValues?.imagePreviewUrl || '');
      setImageFileName('');
      return;
    }

    setImageFile(file);
    setImageFileName(`${file.name} (${toReadableFileSize(file.size)})`);

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      setImagePreviewUrl(typeof loadEvent.target?.result === 'string' ? loadEvent.target.result : '');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (!formValues.name?.trim()) {
      setFormError('Name is required.');
      return;
    }
    if (formValues.price === '' || Number.isNaN(Number(formValues.price))) {
      setFormError('Price must be a numeric value.');
      return;
    }

    try {
      await onSubmit({ ...formValues, imageFile });
      if (mode === 'create') {
        setFormValues(initialValues);
        setImageFile(null);
        setImagePreviewUrl('');
        setImageFileName('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error) {
      setFormError(error?.message || 'An unexpected error occurred.');
    }
  };

  return (
    <form id="product-form" className="stack" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="product-name">Name *</label>
          <input
            id="product-name"
            name="name"
            value={formValues.name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="product-price">Price (EUR) *</label>
          <input
            id="product-price"
            name="price"
            type="number"
            min="0"
            step="0.01"
            value={formValues.price}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="product-status">Status</label>
          <select id="product-status" name="status" value={formValues.status} onChange={handleChange}>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="product-stockQuantity">Stock quantity</label>
          <input
            id="product-stockQuantity"
            name="stockQuantity"
            type="number"
            min="0"
            value={formValues.stockQuantity}
            onChange={handleChange}
          />
        </div>
        <div className="form-field">
          <label htmlFor="purchase-limit-input">Purchase limit</label>
          <input
            id="purchase-limit-input"
            name="purchaseLimit"
            type="number"
            min="1"
            max="50"
            value={formValues.purchaseLimit}
            onChange={handleChange}
          />
        </div>
        <div className="form-field">
          <label htmlFor="product-lowStockThreshold">Low-stock threshold</label>
          <input
            id="product-lowStockThreshold"
            name="lowStockThreshold"
            type="number"
            min="0"
            value={formValues.lowStockThreshold}
            onChange={handleChange}
          />
        </div>
        <div className="form-field">
          <label htmlFor="product-displayOrder">Display order</label>
          <input
            id="product-displayOrder"
            name="displayOrder"
            type="number"
            min="0"
            value={formValues.displayOrder}
            onChange={handleChange}
          />
        </div>
        <div className="form-field">
          <label htmlFor="product-category">Primary category</label>
          <select
            id="product-category"
            name="primaryCategory"
            value={formValues.categoryIds?.[0] || ''}
            onChange={handlePrimaryCategoryChange}
            disabled={disableCategorySelection}
          >
            <option value="">{categoriesLoading ? 'Loading categories…' : 'Select category'}</option>
            {(categories || []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {categoriesError && <span className="helper error">Unable to load categories.</span>}
        </div>
        <div className="form-field">
          <label htmlFor="category-multiselect">Additional categories</label>
          <select
            id="category-multiselect"
            name="categoryIds"
            multiple
            value={formValues.categoryIds || []}
            onChange={handleCategorySelection}
            disabled={disableCategorySelection}
            size={Math.max(Math.min((categories || []).length || 4, 10), 4)}
          >
            {(categories || []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <span className="helper">Hold Ctrl (Windows) or ⌘ (Mac) to select multiple categories.</span>
        </div>
      </div>

      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="product-description">Description</label>
          <textarea
            id="product-description"
            name="description"
            value={formValues.description}
            onChange={handleChange}
            maxLength={2000}
          />
        </div>
        <div className="form-field">
          <label htmlFor="product-allergens">Allergen notes</label>
          <textarea
            id="product-allergens"
            name="allergens"
            value={formValues.allergens}
            onChange={handleChange}
            maxLength={500}
          />
        </div>
        <div className="form-field">
          <label htmlFor="product-imageAlt">Image alt text</label>
          <textarea
            id="product-imageAlt"
            name="imageAlt"
            value={formValues.imageAlt}
            onChange={handleChange}
            maxLength={255}
          />
        </div>
        <div className="form-field">
          <label htmlFor="product-image">Product image</label>
          <input
            id="product-image"
            name="product-image"
            type="file"
            ref={fileInputRef}
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
          />
          <span className="helper">JPEG, PNG, or WebP up to 5MB.</span>
          {imageFileName && <div className="helper">Selected: {imageFileName}</div>}
        </div>
        <div className="form-field">
          <label htmlFor="product-metadata">Metadata (JSON)</label>
          <textarea
            id="product-metadata"
            name="metadata"
            value={formValues.metadata}
            onChange={handleChange}
          />
          <span className="helper">Example: {`{"calories": 220}`}</span>
        </div>
      </div>

      {imagePreviewUrl && (
        <div className="image-preview">
          <img
            id="image-preview"
            src={imagePreviewUrl}
            alt={formValues.imageAlt || 'Product image preview'}
            style={{ maxWidth: '320px', borderRadius: '12px', border: '1px solid #e5e7eb' }}
          />
        </div>
      )}

      <div className="inline" style={{ justifyContent: 'space-between' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            name="isActive"
            checked={formValues.isActive}
            onChange={handleChange}
          />
          Active in kiosk listings
        </label>
        <button id="save-product-button" className="button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : submitLabel}
        </button>
      </div>

      {formError && (
        <div className="alert error">
          <span>{formError}</span>
        </div>
      )}
    </form>
  );
};

export default ProductForm;
