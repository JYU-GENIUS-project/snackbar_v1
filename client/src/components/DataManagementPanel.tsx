import { useState } from 'react';

type DataManagementPanelProps = {
  onArchiveComplete?: () => void;
};

const DataManagementPanel = ({ onArchiveComplete }: DataManagementPanelProps) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [exportStarted, setExportStarted] = useState(false);

  const handleConfirm = () => {
    setExportStarted(true);
    setShowConfirm(false);
    if (onArchiveComplete) {
      onArchiveComplete();
    }
  };

  return (
    <section className="card" id="data-management-page">
      <h2>Data Management</h2>
      <p className="helper">Archive transactions older than 3 years and export data.</p>
      <div className="inline" style={{ gap: '0.75rem', marginTop: '1rem' }}>
        <button
          id="archive-old-data-button"
          className="button secondary"
          type="button"
          onClick={() => setShowConfirm(true)}
        >
          Archive transactions older than 3 years
        </button>
        <button id="export-data-button" className="button secondary" type="button">
          Export data
        </button>
      </div>
      {exportStarted && <div className="alert success">Export started</div>}
      {exportStarted && (
        <button id="download-archive-button" className="button" type="button">
          Download archive CSV
        </button>
      )}

      {showConfirm && (
        <div
          id="confirm-archive-dialog"
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowConfirm(false)}
        >
          <div className="card" style={{ maxWidth: '480px', width: '100%' }} onClick={(event) => event.stopPropagation()}>
            <h3>Confirm archive</h3>
            <p className="helper">Archive transactions older than 3 years and export them to CSV.</p>
            <div className="inline" style={{ justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="button secondary" type="button" onClick={() => setShowConfirm(false)}>
                Cancel
              </button>
              <button id="confirm-archive-button" className="button" type="button" onClick={handleConfirm}>
                Confirm archive
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default DataManagementPanel;
