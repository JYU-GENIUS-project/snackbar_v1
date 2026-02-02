import { useEffect, useMemo, useState } from 'react';

type Category = {
  id?: string | null;
  name?: string | null;
  productCount?: number | null;
};

type CategoryFormStatus = {
  id: string;
  tone: 'success' | 'error' | 'info';
  text: string;
};

type DeleteError = {
  message: string;
  advice?: string | null;
};

type CategoryManagerProps = {
  categories?: Category[];
  isLoading?: boolean;
  error?: { message?: string } | null;
  onCreate?: (payload: { name: string }) => Promise<void> | void;
  onUpdate?: (payload: { id: string; name: string }) => Promise<void> | void;
  onDelete?: (payload: { id: string }) => Promise<void> | void;
  isCreating?: boolean;
  isUpdating?: boolean;
  isDeleting?: boolean;
  deletePendingId?: string | null;
};

const asyncNoop = async () => undefined;

const CategoryManager = ({
  categories = [],
  isLoading = false,
  error = null,
  onCreate = asyncNoop,
  onUpdate = asyncNoop,
  onDelete = asyncNoop,
  isCreating = false,
  isUpdating = false,
  isDeleting = false,
  deletePendingId = null
}: CategoryManagerProps) => {
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [categoryName, setCategoryName] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<CategoryFormStatus | null>(null);
  const [isLocalSubmitting, setIsLocalSubmitting] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<DeleteError | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  const normalizedCategories = useMemo(() => {
    if (!Array.isArray(categories)) {
      return [] as { id: string | null; name: string }[];
    }

    return categories
      .map((category) => ({
        id: category?.id ?? null,
        name: typeof category?.name === 'string' ? category.name.trim().toLowerCase() : ''
      }))
      .filter((category) => Boolean(category.name));
  }, [categories]);

  const hasCategories = useMemo(() => normalizedCategories.length > 0, [normalizedCategories]);
  const pendingCategory = useMemo(
    () => (Array.isArray(categories) ? categories.find((category) => category?.id === pendingDeleteId) || null : null),
    [categories, pendingDeleteId]
  );
  const pendingCategoryProductCount = Number(pendingCategory?.productCount ?? 0);
  const isDeleteBlocked = pendingCategoryProductCount > 0;

  const validateCategoryName = (value: string) => {
    const rawValue = typeof value === 'string' ? value : '';
    const trimmed = rawValue.trim();

    if (!trimmed) {
      return 'Category name is required';
    }

    if (trimmed.length > 50) {
      return 'Maximum 50 characters';
    }

    if (!/^[-A-Za-z0-9 ]+$/.test(trimmed)) {
      return 'Only letters, numbers, spaces and hyphens allowed';
    }

    const normalized = trimmed.toLowerCase();
    const hasDuplicate = normalizedCategories.some((category) => {
      if (category.name !== normalized) {
        return false;
      }

      if (formMode === 'edit' && category.id === activeCategoryId) {
        return false;
      }

      return true;
    });

    if (hasDuplicate) {
      return 'Category name already exists';
    }

    return null;
  };

  const validationMessage = validateCategoryName(categoryName);
  const shouldShowValidation = formMode === 'create' || hasInteracted;
  const formError = submitError || (shouldShowValidation ? validationMessage : null);

  const handleNameFocus = () => {
    if (!hasInteracted) {
      setHasInteracted(true);
    }
    setSubmitError(null);
  };

  useEffect(() => {
    if (!isFormVisible) {
      return;
    }

    if (formMode === 'create') {
      setSubmitError(null);
    }
  }, [isFormVisible, formMode]);

  const resetFormState = () => {
    setCategoryName('');
    setActiveCategoryId(null);
    setSubmitError(null);
    setIsLocalSubmitting(false);
    setHasInteracted(false);
  };

  const handleStartCreate = () => {
    setFormMode('create');
    setIsFormVisible(true);
    resetFormState();
    setStatusMessage(null);
    setHasInteracted(true);
    setSubmitError(null);
  };

  const handleStartEdit = (category: Category) => {
    setFormMode('edit');
    setIsFormVisible(true);
    setActiveCategoryId(category.id ?? null);
    setCategoryName(category.name || '');
    setSubmitError(null);
    setStatusMessage(null);
    setHasInteracted(false);
  };

  const handleCancelForm = () => {
    setIsFormVisible(false);
    resetFormState();
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setCategoryName(nextValue);
    if (!hasInteracted) {
      setHasInteracted(true);
    }
    setSubmitError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setHasInteracted(true);
    const nextValidation = validateCategoryName(categoryName);
    if (nextValidation) {
      return;
    }

    const trimmedName = categoryName.trim();

    setSubmitError(null);
    setIsLocalSubmitting(true);

    try {
      if (formMode === 'create') {
        await onCreate({ name: trimmedName });
        setStatusMessage({ id: 'success-message', tone: 'success', text: 'Category created successfully' });
        resetFormState();
        setIsFormVisible(true);
        return;
      }

      if (formMode === 'edit' && activeCategoryId) {
        await onUpdate({ id: activeCategoryId, name: trimmedName });
        setStatusMessage({ id: 'success-message', tone: 'success', text: 'Category updated successfully' });
        setIsFormVisible(false);
        resetFormState();
        return;
      }
      resetFormState();
    } catch (errorReason) {
      setSubmitError(errorReason instanceof Error ? errorReason.message : 'Failed to save category.');
    } finally {
      setIsLocalSubmitting(false);
    }
  };

  const requestDelete = (category: Category) => {
    setPendingDeleteId(category.id ?? null);
    setDeleteError(null);
    const productCount = Number(category?.productCount ?? 0);
    if (productCount > 0) {
      setDeleteError({
        message: 'Cannot delete category with assigned products',
        advice: 'Please reassign or delete products first'
      });
    }
  };

  const cancelDelete = () => {
    setPendingDeleteId(null);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) {
      return;
    }

    if (isDeleteBlocked) {
      setDeleteError({
        message: 'Cannot delete category with assigned products',
        advice: 'Please reassign or delete products first'
      });
      return;
    }

    setDeleteError(null);

    try {
      await onDelete({ id: pendingDeleteId });
      setStatusMessage({ id: 'success-message', tone: 'success', text: 'Category deleted' });
      setPendingDeleteId(null);
    } catch (deleteErrorReason) {
      const err = deleteErrorReason as { message?: string; details?: { advice?: string | null } } | null;
      setDeleteError({
        message: err?.message || 'Cannot delete category with assigned products',
        advice: err?.details?.advice || null
      });
    }
  };

  const resolveStatusClass = (tone: CategoryFormStatus['tone']) => {
    if (tone === 'success') {
      return 'alert success success-message';
    }
    if (tone === 'error') {
      return 'alert error error-message';
    }
    return 'alert info';
  };

  return (
    <section id="category-management-page" className="card stack" aria-live="polite">
      <div className="inline" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2>Category Management</h2>
          <p className="helper">Organise products by defining reusable categories.</p>
        </div>
        <button
          id="create-category-button"
          className="button"
          type="button"
          onClick={handleStartCreate}
          disabled={isLocalSubmitting || isCreating || isUpdating}
        >
          Create New Category
        </button>
      </div>

      {statusMessage && (
        <div id={statusMessage.id} className={resolveStatusClass(statusMessage.tone)}>
          <span>{statusMessage.text}</span>
          <button className="button secondary" type="button" onClick={() => setStatusMessage(null)}>
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="alert error" role="alert">
          <span>{error.message || 'Failed to load categories.'}</span>
        </div>
      )}

      {isLoading && (
        <div className="alert info" role="status">
          <span>Loading categories…</span>
        </div>
      )}

      {isFormVisible && (
        <form id="category-form" className="stack" onSubmit={handleSubmit}>
          <label htmlFor="category-name-input" style={{ fontWeight: 600 }}>
            Category name
          </label>
          <input
            id="category-name-input"
            name="name"
            type="text"
            value={categoryName}
            onChange={handleNameChange}
            onFocus={handleNameFocus}
            autoFocus
            aria-describedby={formError ? 'category-name-error' : undefined}
          />
          <div
            id="category-name-error"
            className="error-message"
            role="alert"
            style={{ display: formError ? 'block' : 'none' }}
          >
            {formError || ''}
          </div>
          <div className="inline" style={{ gap: '0.75rem' }}>
            <button
              id="save-category-button"
              className="button"
              type="submit"
              disabled={isLocalSubmitting || isCreating || isUpdating}
            >
              {formMode === 'create' ? 'Save Category' : 'Save Changes'}
            </button>
            <button id="cancel-category-button" className="button secondary" type="button" onClick={handleCancelForm}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div id="category-list" className="table-wrapper" role="region" aria-live="polite">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col" style={{ width: '140px' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {!hasCategories && (
              <tr id="empty-category-state">
                <td colSpan={2} style={{ textAlign: 'center', color: '#9ca3af' }}>
                  No categories found.
                </td>
              </tr>
            )}
            {hasCategories &&
              categories.map((category) => (
                <tr key={category.id || category.name} className="category-list-item">
                  <td>{category.name}</td>
                  <td>
                    <div className="inline" style={{ justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button className="button secondary" type="button" onClick={() => handleStartEdit(category)}>
                        Edit
                      </button>
                      <button className="button secondary" type="button" onClick={() => requestDelete(category)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {pendingDeleteId && (
        <div id="confirm-delete-dialog" className="dialog" role="alertdialog" aria-modal="true">
          <div className="card stack" style={{ gap: '0.75rem' }}>
            <h3>Delete category?</h3>
            <p>Deleting a category removes it from the admin view.</p>
            {deleteError && (
              <div id="delete-error-dialog" className="alert warning warning-message">
                <span>{deleteError.message}</span>
                {deleteError.advice && <div id="delete-error-advice">{deleteError.advice}</div>}
              </div>
            )}
            <div className="inline" style={{ justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button id="close-dialog-button" className="button secondary" type="button" onClick={cancelDelete}>
                Cancel
              </button>
              <button
                id="confirm-delete-button"
                className="button"
                type="button"
                onClick={confirmDelete}
                disabled={isDeleteBlocked || (isDeleting && deletePendingId === pendingDeleteId)}
              >
                {isDeleting && deletePendingId === pendingDeleteId ? 'Deleting…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default CategoryManager;
