"use client";

import type React from "react";
import { useCallback, useRef, useState } from "react";
import { CheckCircle2, ExternalLink, FileText, Upload, X } from "lucide-react";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { zenodoService } from "../../services/zenodoService";
import type { ZenodoPublication, ZenodoPublishTarget } from "../../types/zenodo";
import { openZenodoViewUrl, resolveZenodoViewUrl } from "../../utils/zenodoUrl";
import "./ZenodoPublishModal.css";

const MAX_FILE_SIZE_MB = 50;

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const validatePdfFile = (file: File): string | null => {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return "Solo se permiten archivos PDF";
  }
  if (file.type && file.type !== "application/pdf") {
    return "El archivo seleccionado no es un PDF válido";
  }
  if (file.size === 0) {
    return "El archivo está vacío";
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `El archivo supera el límite de ${MAX_FILE_SIZE_MB} MB`;
  }
  return null;
};

interface ZenodoPublishModalProps {
  isOpen: boolean;
  target: ZenodoPublishTarget | null;
  onClose: () => void;
  onPublished?: (zenodoUrl?: string | null, publication?: ZenodoPublication) => void;
}

export const ZenodoPublishModal: React.FC<ZenodoPublishModalProps> = ({
  isOpen,
  target,
  onClose,
  onPublished,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [publishedViewUrl, setPublishedViewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetState = useCallback(() => {
    setSelectedFile(null);
    setIsDragging(false);
    setFileError(null);
    setSubmitError(null);
    setSuccessMessage(null);
    setPublishedViewUrl(null);
    setIsSubmitting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSelectFile = (file: File) => {
    const validationError = validatePdfFile(file);
    if (validationError) {
      setSelectedFile(null);
      setFileError(validationError);
      return;
    }
    setSelectedFile(file);
    setFileError(null);
    setSubmitError(null);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    handleSelectFile(file);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    handleSelectFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePublish = async () => {
    if (!target) return;
    if (!selectedFile) {
      setFileError("Debe adjuntar un archivo PDF para publicar en Zenodo");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      const response = await zenodoService.publish(target.entityType, target.entityId, selectedFile, true);
      const viewUrl = resolveZenodoViewUrl(response.publication);
      setSuccessMessage(response.message || "El registro se publicó correctamente en Zenodo.");
      setPublishedViewUrl(viewUrl);
      onPublished?.(viewUrl, response.publication);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Error al publicar en Zenodo");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !target) return null;

  const isPublished = Boolean(successMessage);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isPublished ? "Registro publicado en Zenodo" : "Publicar en Zenodo"}
      size="md"
    >
      <div className="zenodo-record-summary">
        <strong>{target.title}</strong>
        <p>
          Tipo: {target.recordType} · ID: {target.entityId}
        </p>
      </div>

      {isPublished ? (
        <div className="zenodo-success-panel" role="status" aria-live="polite">
          <div className="zenodo-success-panel__icon" aria-hidden="true">
            <CheckCircle2 size={48} />
          </div>
          <p className="zenodo-success-panel__message">{successMessage}</p>
          {publishedViewUrl ? (
            <p className="zenodo-success-panel__url">{publishedViewUrl}</p>
          ) : (
            <p className="zenodo-success-panel__hint">
              La publicación se completó, pero no se recibió una URL de visualización desde Zenodo.
            </p>
          )}
          <div className="zenodo-modal-actions zenodo-modal-actions--success">
            {publishedViewUrl && (
              <Button
                type="button"
                onClick={() => openZenodoViewUrl(publishedViewUrl)}
                aria-label="Abrir el registro publicado en Zenodo en una pestaña nueva"
              >
                <ExternalLink size={16} aria-hidden="true" />
                Ver en Zenodo
              </Button>
            )}
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cerrar
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div
            className={`zenodo-dropzone ${isDragging ? "zenodo-dropzone--active" : ""} ${fileError ? "zenodo-dropzone--error" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Zona para arrastrar o seleccionar un archivo PDF"
          >
            <div className="zenodo-dropzone-icon">
              <Upload size={32} aria-hidden="true" />
            </div>
            <p className="zenodo-dropzone-title">Arrastre su PDF aquí o haga clic para seleccionarlo</p>
            <p className="zenodo-dropzone-hint">Formato obligatorio: PDF · Máximo {MAX_FILE_SIZE_MB} MB</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="zenodo-hidden-input"
            onChange={handleInputChange}
            aria-label="Seleccionar archivo PDF"
          />

          {selectedFile && (
            <div className="zenodo-file-preview">
              <div className="zenodo-file-info">
                <FileText size={20} aria-hidden="true" />
                <div>
                  <div className="zenodo-file-name">{selectedFile.name}</div>
                  <div className="zenodo-file-size">{formatFileSize(selectedFile.size)}</div>
                </div>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={handleRemoveFile} aria-label="Quitar archivo">
                <X size={16} />
              </Button>
            </div>
          )}

          {fileError && <p className="zenodo-error">{fileError}</p>}
          {submitError && <p className="zenodo-error">{submitError}</p>}

          <div className="zenodo-modal-actions">
            <Button type="button" variant="secondary" onClick={handleClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="button" onClick={handlePublish} disabled={isSubmitting || !selectedFile}>
              {isSubmitting ? "Publicando..." : "Publicar en Zenodo"}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
};
