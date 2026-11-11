import { useEffect, useId, useRef, useState } from 'react';
import { ImagePlus, RefreshCw, Trash2, Upload } from 'lucide-react';
import { api } from '../lib/api.js';
import { UPLOAD_ACCEPT, UPLOAD_MAX_BYTES } from '../lib/constants.js';
import { cx } from '../lib/cx.js';
import { showsCutout, uploadedThumb } from '../../lib/media.js';
import { Spinner } from './Skeleton.jsx';
import { Checkbox } from './FormControls.jsx';
import { BTN_DANGER } from './ui.js';

function validate(file) {
  if (!UPLOAD_ACCEPT.includes(file.type)) return 'Please choose a JPEG, PNG, WebP or AVIF image.';
  if (file.size > UPLOAD_MAX_BYTES) {
    return `That image is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 5 MB.`;
  }
  return null;
}

/** Best small image of a website photo from photos.generated.json (cut-out preferred). */
function sitePhotoSrc(photo) {
  const p = photo.cutout || photo;
  return p.srcset?.split(',')[1]?.trim().split(' ')[0] || p.src;
}

/**
 * Drag-and-drop (or click-to-browse) photo uploader.
 * value: null | { url, publicId, illustrative, width?, height? }
 * Uploads immediately to POST /api/admin/uploads (Cloudinary, or the server's own disk);
 * the parent saves `value` on the item.
 * sitePhoto: the photo the website already shows for this dish (used until one is uploaded).
 */
export function ImageUpload({ value, onChange, error, label = 'Photo', onBusyChange, sitePhoto = null }) {
  const inputRef = useRef(null);
  const labelId = useId();
  const hintId = useId();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => onBusyChange?.(uploading), [uploading, onBusyChange]);
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  async function handleFile(file) {
    setMessage('');
    if (!file) return;
    const problem = validate(file);
    if (problem) {
      setMessage(problem);
      return;
    }
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploading(true);
    try {
      const res = await api.upload(file);
      onChange({
        url: res.url,
        publicId: res.publicId,
        illustrative: false,
        display: 'cutout',
        ...(res.width && res.height ? { width: res.width, height: res.height } : {}),
        ...(res.cutout?.url ? { cutout: res.cutout } : {}),
      });
    } catch (err) {
      setMessage(err?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const browse = () => inputRef.current?.click();
  const shownUrl = preview || uploadedThumb(value);
  const cutShown = !preview && showsCutout(value);
  const errorText = message || error;

  const onDragOver = (e) => {
    if (uploading) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragging(true);
  };
  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (uploading) return;
    handleFile(e.dataTransfer.files?.[0]);
  };

  let caption = 'No photo yet';
  if (preview) caption = 'Removing the background…';
  else if (value?.url)
    caption = cutShown ? 'Your photo · food on black' : value.illustrative ? 'Your photo · illustrative' : 'Your photo';
  else if (sitePhoto) caption = sitePhoto.illustrative ? 'On the website · stock photo' : 'On the website now';

  return (
    <div role="group" aria-labelledby={labelId} aria-describedby={hintId}>
      <p id={labelId} className="field-label text-ink">
        {label} <span className="font-normal text-muted-dark">(optional)</span>
      </p>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
        {/* Preview — black, like the dish cards on the website */}
        <figure className="w-full shrink-0 sm:w-52">
          <button
            type="button"
            onClick={browse}
            disabled={uploading}
            aria-label={value?.url || sitePhoto ? 'Replace photo' : 'Add a photo'}
            className="group relative block aspect-[4/3] w-full overflow-hidden rounded-xl bg-black ring-1 ring-ink/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron"
          >
            {cutShown ? (
              <>
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_55%,rgba(240,160,50,.16),transparent_72%)]"
                />
                <img src={shownUrl} alt="" className="relative size-full object-contain p-3" />
              </>
            ) : shownUrl ? (
              <img src={shownUrl} alt="" className="size-full object-cover" />
            ) : sitePhoto ? (
              <>
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_55%,rgba(240,160,50,.16),transparent_72%)]"
                />
                <img
                  src={sitePhotoSrc(sitePhoto)}
                  alt=""
                  className={cx('relative size-full', sitePhoto.cutout ? 'object-contain p-3' : 'object-cover')}
                />
              </>
            ) : (
              <span className="flex size-full flex-col items-center justify-center gap-1.5 text-xs font-medium text-muted-dark">
                <ImagePlus aria-hidden="true" className="size-7 text-saffron/80" />
                Add a photo
              </span>
            )}
            {!uploading && (shownUrl || sitePhoto) && (
              <span className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/55 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <RefreshCw aria-hidden="true" className="size-3.5" /> Replace
              </span>
            )}
            {uploading && (
              <span
                className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm font-medium text-white"
                role="status"
              >
                <Spinner className="mr-2 size-4" /> Processing…
              </span>
            )}
          </button>
          <figcaption className="mt-1.5 text-center text-xs text-muted-dark">{caption}</figcaption>
        </figure>

        {/* Drop zone */}
        <div
          onDragOver={onDragOver}
          onDragEnter={onDragOver}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cx(
            'flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors',
            dragging ? 'border-saffron bg-saffron/10' : 'border-ink/15 bg-cream/40',
          )}
        >
          <Upload aria-hidden="true" className="size-6 text-saffron" />
          <p className="text-sm text-ink">
            <span className="hidden sm:inline">Drag a photo here, or </span>
            <button
              type="button"
              onClick={browse}
              disabled={uploading}
              className="font-semibold text-saffron underline decoration-saffron/40 underline-offset-2 hover:decoration-saffron disabled:opacity-50"
            >
              {value?.url || sitePhoto ? 'choose a new photo' : 'choose a photo'}
            </button>
          </p>
          <p id={hintId} className="text-xs text-muted-dark">
            JPEG, PNG, WebP or AVIF · max 5 MB · a sharp, well-lit photo on a dark table looks best
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={UPLOAD_ACCEPT.join(',')}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      </div>

      {errorText && (
        <p className="field-error" role="alert">
          {errorText}
        </p>
      )}

      {value?.url && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            {value.cutout?.url && (
              <Checkbox
                label="Show only the food, on black"
                description="The background was removed automatically, like the other dishes on the website. Untick to show the full photo."
                checked={value.display !== 'photo'}
                onChange={(e) =>
                  onChange({
                    ...value,
                    display: e.target.checked ? 'cutout' : 'photo',
                  })
                }
              />
            )}
            <Checkbox
              label="Label as illustrative (not a photo of Fuji’s dish)"
              description="Shows an “Illustrative image” label on the public menu."
              checked={Boolean(value.illustrative)}
              onChange={(e) => onChange({ ...value, illustrative: e.target.checked })}
            />
          </div>
          <button type="button" className={cx(BTN_DANGER, 'shrink-0 self-start')} onClick={() => onChange(null)} disabled={uploading}>
            <Trash2 aria-hidden="true" className="size-4" />
            {sitePhoto ? 'Use the website photo' : 'Remove photo'}
          </button>
        </div>
      )}
    </div>
  );
}
