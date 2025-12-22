import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { fetchLatestQueries } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog";

interface QueryImage {
  id: string;
  imageUrl: string;
  downloadCount: number;
  shareCount: number;
  createdAt: string;
  userId: string;
  sessionId: string;
}

export default function LatestQueries() {
  const [selectedImage, setSelectedImage] = useState<QueryImage | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const imageRefs = useRef<Map<string, HTMLImageElement>>(new Map());
  const limit = 50;
  const maxTotal = 500;

  const {
    data,
    isLoading,
  } = useQuery({
    queryKey: ['latest-queries'],
    queryFn: () => fetchLatestQueries(1, limit),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Get images from single query result
  const allImages = (data as any)?.data || [];
  const validImages = allImages.filter((img: QueryImage) => !failedImages.has(img.id));

  const handleImageLoad = (id: string) => {
    setLoadedImages(prev => new Set(prev).add(id));
  };

  const handleImageError = (id: string) => {
    setFailedImages(prev => new Set(prev).add(id));
  };

  const handleImageClick = (image: QueryImage) => {
    setSelectedImage(image);
  };

  const handleDownload = async (image: QueryImage, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    try {
      const imgElement = imageRefs.current.get(image.id);
      if (imgElement && imgElement.complete && imgElement.naturalHeight !== 0) {
        // Image is already loaded, use it directly
        const canvas = document.createElement('canvas');
        canvas.width = imgElement.naturalWidth;
        canvas.height = imgElement.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(imgElement, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `image-${image.id}.jpg`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }
          }, 'image/jpeg');
        }
      } else {
        // Try to fetch the image
        const response = await fetch(image.imageUrl, { mode: 'cors' });
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `image-${image.id}.jpg`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } else {
          // Fallback: open in new tab
          window.open(image.imageUrl, '_blank');
        }
      }
    } catch (error) {
      console.error('Error downloading image:', error);
      // Fallback: open in new tab
      window.open(image.imageUrl, '_blank');
    }
  };

  if (isLoading && validImages.length === 0) {
    return (
      <DashboardLayout>
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Latest Queries</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Browse the most recent user queries with high engagement.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 50 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Latest Queries</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Browse the most recent user queries with high engagement {validImages.length > 0 && `(showing ${validImages.length} images)`}.
        </p>
      </div>

      {validImages.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          No images available
        </div>
      ) : (
        <>
          {/* Pinterest-style grid */}
          <div className="columns-1 sm:columns-2 md:columns-3 gap-4 mb-8">
            {validImages.map((image: QueryImage) => (
              <div
                key={image.id}
                className="break-inside-avoid mb-4 relative group rounded-lg overflow-hidden bg-muted shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleImageClick(image)}
              >
                {/* Image container */}
                <div className="relative w-full">
                  {!loadedImages.has(image.id) && !failedImages.has(image.id) && (
                    <div className="w-full aspect-square flex items-center justify-center bg-muted">
                      <Skeleton className="w-full h-full" />
                    </div>
                  )}
                  <img
                    ref={(el) => {
                      if (el) imageRefs.current.set(image.id, el);
                    }}
                    src={image.imageUrl}
                    alt={`Query ${image.id}`}
                    className={cn(
                      "w-full h-auto object-cover transition-opacity duration-300",
                      loadedImages.has(image.id) ? "opacity-100" : "opacity-0",
                      failedImages.has(image.id) && "hidden"
                    )}
                    onLoad={() => handleImageLoad(image.id)}
                    onError={() => handleImageError(image.id)}
                    loading="lazy"
                  />
                  
                  {/* Download/Share count badge - top right */}
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md flex items-center gap-2 z-10">
                    <span className="flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      {image.downloadCount || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Share2 className="h-3 w-3" />
                      {image.shareCount || 0}
                    </span>
                  </div>

                  {/* Download button - bottom center, shown on hover */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full"
                      onClick={(e) => handleDownload(image, e)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </>
      )}

      {/* Expanded Image Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent 
          className="max-w-[95vw] w-[95vw] max-h-[95vh] h-[95vh] p-0 bg-black/95 border-none m-0 overflow-hidden !translate-x-[-50%] !translate-y-[-50%] !left-1/2 !top-1/2"
        >
          {selectedImage && (
            <div className="relative w-full h-full flex items-center justify-center p-2 sm:p-4 overflow-hidden">
              <DialogClose className="absolute top-2 right-2 z-50 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none bg-black/50 text-white p-2">
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="sr-only">Close</span>
              </DialogClose>
              
              <img
                src={selectedImage.imageUrl}
                alt={`Query ${selectedImage.id}`}
                className="max-w-full max-h-[calc(95vh-100px)] sm:max-h-[calc(95vh-120px)] object-contain"
                style={{ 
                  maxWidth: '100%',
                  maxHeight: 'calc(95vh - 100px)',
                  width: 'auto',
                  height: 'auto'
                }}
              />
              
              {/* Download button in modal */}
              <div className="absolute bottom-2 sm:bottom-4 left-1/2 transform -translate-x-1/2 z-50">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => handleDownload(selectedImage, e)}
                  className="bg-white/90 hover:bg-white text-black text-xs sm:text-sm"
                >
                  <Download className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="hidden sm:inline">Download Image</span>
                  <span className="sm:hidden">Download</span>
                </Button>
              </div>

              {/* Stats in modal */}
              <div className="absolute top-2 sm:top-4 left-2 sm:left-4 bg-black/70 text-white text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 rounded-md flex items-center gap-2 sm:gap-3 flex-wrap">
                <span className="flex items-center gap-1">
                  <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{selectedImage.downloadCount || 0} Downloads</span>
                  <span className="sm:hidden">{selectedImage.downloadCount || 0} D</span>
                </span>
                <span className="flex items-center gap-1">
                  <Share2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{selectedImage.shareCount || 0} Shares</span>
                  <span className="sm:hidden">{selectedImage.shareCount || 0} S</span>
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
