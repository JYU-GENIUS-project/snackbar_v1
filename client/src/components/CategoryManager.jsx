import { useMemo, useState } from 'react';

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
}) => {
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [categoryName, setCategoryName] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [formError, setFormError] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [isLocalSubmitting, setIsLocalSubmitting] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const hasCategories = useMemo(() => Array.isArray(categories) && categories.length > 0, [categories]);

  const resetFormState = () => {
    setCategoryName('');
    setActiveCategoryId(null);
    setFormError(null);
    setIsLocalSubmitting(false);
  };

  const handleStartCreate = () => {
    setFormMode('create');
    setIsFormVisible(true);
    resetFormState();
  };

  const handleStartEdit = (category) => {
    setFormMode('edit');
    setIsFormVisible(true);
    setActiveCategoryId(category.id);
    setCategoryName(category.name || '');
    setFormError(null);
    setStatusMessage(null);
  };

  const handleCancelForm = () => {
    setIsFormVisible(false);
    resetFormState();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedName = categoryName.trim();

    if (!trimmedName) {
      setFormError('Category name is required');
      return;
    }

    if (trimmedName.length > 50) {
      setFormError('Maximum 50 characters');
      return;
    }

    if (!/^[-A-Za-z0-9 ]+$/.test(trimmedName)) {
      setFormError('Only letters, numbers, spaces and hyphens allowed');
      return;
    }

    setFormError(null);
    setIsLocalSubmitting(true);

    try {
      if (formMode === 'create') {
        await onCreate({ name: trimmedName });
        setStatusMessage({ id: 'success-message', tone: 'success', text: 'Category created successfully' });
      } else if (formMode === 'edit' && activeCategoryId) {
        await onUpdate({ id: activeCategoryId, name: trimmedName });
        setStatusMessage({ id: 'success-message', tone: 'success', text: 'Category updated successfully' });
      }
      setIsFormVisible(false);
      resetFormState();
    } catch (submitError) {
      setFormError(submitError?.message || 'Failed to save category.');
    } finally {
      setIsLocalSubmitting(false);
    }
  };

  const requestDelete = (category) => {
    setPendingDeleteId(category.id);
    setDeleteError(null);
  };

  const cancelDelete = () => {
    setPendingDeleteId(null);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) {
      return;
    }

    setDeleteError(null);

    try {
      await onDelete({ id: pendingDeleteId });
      setStatusMessage({ id: 'success-message', tone: 'success', text: 'Category deleted' });
      setPendingDeleteId(null);
    } catch (deleteErrorReason) {
      setDeleteError({
        message: deleteErrorReason?.message || 'Cannot delete category with assigned products',
        advice: deleteErrorReason?.details?.advice || null
      });
    }
  };

  const resolveStatusClass = (tone) => {
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
            onChange={(event) => setCategoryName(event.target.value)}
            maxLength={50}
            autoFocus
          />
          {formError && (
            <div id="category-name-error" className="error-message">
              {formError}
            </div>
          )}
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
                {deleteError.advice && (
                  <div id="delete-error-advice">{deleteError.advice}</div>
                )}
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
                disabled={isDeleting && deletePendingId === pendingDeleteId}
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
