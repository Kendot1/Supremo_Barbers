import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Upload, X, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import API from '../services/api.service';

export function ImageUploadTest() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadedUrl, setUploadedUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    // Store file and create preview
    setUploadedFile(file);
    setUploadStatus('idle');
    setUploadedUrl('');

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!uploadedFile) {
      toast.error('Please select an image first');
      return;
    }

    try {
      setIsUploading(true);
      setUploadStatus('idle');

      const formData = new FormData();
      formData.append('file', uploadedFile);


      const response = await API.uploadImage(formData);


      setUploadedUrl(response.url);
      setUploadStatus('success');
      toast.success('Image uploaded successfully to Cloudflare R2!');
    } catch (error) {
      console.error('❌ Upload failed:', error);
      setUploadStatus('error');

      if (error instanceof Error) {
        toast.error(`Upload failed: ${error.message}`);
      } else {
        toast.error('Failed to upload image. Please check your Cloudflare R2 configuration.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setUploadedFile(null);
    setImagePreview('');
    setUploadedUrl('');
    setUploadStatus('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="border-[#E8DCC8]">
      <CardHeader>
        <CardTitle className="text-[#5C4A3A] flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Cloudflare R2 Upload Test
        </CardTitle>
        <CardDescription className="text-[#87765E]">
          Test your Cloudflare R2 image upload configuration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload Section */}
        <div className="space-y-2">
          <Label htmlFor="test-upload" className="text-[#5C4A3A]">
            Select Image
          </Label>
          <div className="flex gap-2">
            <Input
              id="test-upload"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={isUploading}
              className="border-[#E8DCC8]"
            />
            {uploadedFile && !isUploading && (
              <Button
                onClick={handleReset}
                variant="outline"
                size="icon"
                className="border-[#E8DCC8] hover:bg-[#FBF7EF]"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Image Preview */}
        {imagePreview && (
          <div className="space-y-2">
            <Label className="text-[#5C4A3A]">Preview</Label>
            <div className="relative w-full h-48 bg-[#FBF7EF] rounded-lg border border-[#E8DCC8] overflow-hidden">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="text-sm text-[#87765E]">
              <span className="font-medium">File:</span> {uploadedFile?.name}
              {' | '}
              <span className="font-medium">Size:</span> {((uploadedFile?.size || 0) / 1024).toFixed(2)} KB
            </div>
          </div>
        )}

        {/* Upload Button */}
        {uploadedFile && uploadStatus !== 'success' && (
          <Button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full bg-[#DB9D47] hover:bg-[#C88D3E] text-white"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading to Cloudflare R2...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload to Cloudflare R2
              </>
            )}
          </Button>
        )}

        {/* Success Status */}
        {uploadStatus === 'success' && uploadedUrl && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div className="flex-1">
                <p className="font-medium text-green-900">Upload Successful!</p>
                <p className="text-sm text-green-700">Image uploaded to Cloudflare R2</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[#5C4A3A]">Uploaded Image URL</Label>
              <div className="p-3 bg-[#FBF7EF] border border-[#E8DCC8] rounded-lg">
                <code className="text-xs text-[#5C4A3A] break-all">{uploadedUrl}</code>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[#5C4A3A]">Verify Image (Public URL)</Label>
              <div className="relative w-full h-48 bg-[#FBF7EF] rounded-lg border border-[#E8DCC8] overflow-hidden">
                <img
                  src={uploadedUrl}
                  alt="Uploaded to R2"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    console.error('Failed to load image from R2 URL');
                    toast.error('Failed to load image. Check if CLOUDFLARE_R2_PUBLIC_URL is configured correctly.');
                  }}
                  onLoad={() => {

                    toast.success('Image is publicly accessible!');
                  }}
                />
              </div>
            </div>

            <Button
              onClick={handleReset}
              variant="outline"
              className="w-full border-[#E8DCC8] hover:bg-[#FBF7EF]"
            >
              Upload Another Image
            </Button>
          </div>
        )}

        {/* Error Status */}
        {uploadStatus === 'error' && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div className="flex-1">
              <p className="font-medium text-red-900">Upload Failed</p>
              <p className="text-sm text-red-700">
                Please check your Cloudflare R2 configuration and credentials.
              </p>
            </div>
          </div>
        )}

        {/* Configuration Info */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Configuration Checklist
          </h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>CLOUDFLARE_ACCOUNT_ID: Set ✓</li>
            <li>CLOUDFLARE_R2_ACCESS_KEY_ID: Set ✓</li>
            <li>CLOUDFLARE_R2_SECRET_ACCESS_KEY: Set ✓</li>
            <li>CLOUDFLARE_R2_BUCKET_NAME: media-files ✓</li>
            <li>CLOUDFLARE_R2_PUBLIC_URL: Configure to view images</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

