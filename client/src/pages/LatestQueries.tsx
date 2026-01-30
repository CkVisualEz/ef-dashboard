import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { fetchLatestQueries } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share2, X, RefreshCw } from "lucide-react";
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
  const [allImagesLoaded, setAllImagesLoaded] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [imageDimensions, setImageDimensions] = useState<Map<string, { width: number; height: number }>>(new Map());
  const imageRefs = useRef<Map<string, HTMLImageElement>>(new Map());

  const {
    data,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['latest-queries'],
    queryFn: () => fetchLatestQueries(),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity, // Data never becomes stale automatically
  });

  // Get images from query result - backend already returns only 50 valid images
  const allImages = (data as any)?.data || [];
  const validImages = allImages.filter((img: QueryImage) => !failedImages.has(img.id));

  // Preload all images before displaying
  useEffect(() => {
    if (allImages.length === 0) {
      setAllImagesLoaded(false);
      setLoadedImages(new Set());
      setFailedImages(new Set());
      setImageDimensions(new Map());
      return;
    }

    // Reset state when data changes
    setAllImagesLoaded(false);
    setLoadedImages(new Set());
    setFailedImages(new Set());
    setImageDimensions(new Map());

    const imageLoadPromises: Promise<void>[] = [];

    allImages.forEach((image: QueryImage) => {
      const img = new Image();
      const promise = new Promise<void>((resolve) => {
        img.onload = () => {
          setLoadedImages(prev => {
            const newSet = new Set(prev);
            newSet.add(image.id);
            return newSet;
          });
          setImageDimensions(prev => {
            const newMap = new Map(prev);
            newMap.set(image.id, { width: img.naturalWidth, height: img.naturalHeight });
            return newMap;
          });
          resolve();
        };
        img.onerror = () => {
          setFailedImages(prev => {
            const newSet = new Set(prev);
            newSet.add(image.id);
            return newSet;
          });
          resolve(); // Resolve anyway to continue
        };
      });
      img.src = image.imageUrl;
      imageLoadPromises.push(promise);
    });

    // Set a timeout to show images even if some fail to load
    const timeoutId = setTimeout(() => {
      setAllImagesLoaded(true);
    }, 3000); // 3 second timeout

    Promise.all(imageLoadPromises).then(() => {
      clearTimeout(timeoutId);
      // Set loaded state after all images are processed
      setTimeout(() => {
        setAllImagesLoaded(true);
      }, 50);
    }).catch(() => {
      clearTimeout(timeoutId);
      // Even if some fail, show what we have
      setAllImagesLoaded(true);
    });
  }, [data]);

  const handleImageLoad = (id: string) => {
    // This is just for the actual img element, dimensions already captured
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
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Latest Queries
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              Browse the last 50 user queries with valid images {validImages.length > 0 && `(showing ${validImages.length} images)`}.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="gap-2 hover:bg-primary hover:text-primary-foreground transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
            {isRefetching ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </div>

      {validImages.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          No images available
        </div>
      ) : (
        <>
          {/* Masonry layout with equal 4px gaps - images flow naturally */}
          <div className="columns-1 sm:columns-2 md:columns-3 gap-1 mb-8">
            {validImages
              .filter((img: QueryImage) => !failedImages.has(img.id))
              .map((image: QueryImage, index: number) => {
                const dimensions = imageDimensions.get(image.id);
                const aspectRatio = dimensions ? dimensions.height / dimensions.width : 1;
                const isLoaded = loadedImages.has(image.id) || allImagesLoaded;
                return (
                  <div
                    key={image.id}
                    className={cn(
                      "relative group overflow-hidden cursor-pointer break-inside-avoid mb-1 rounded-lg shadow-sm hover:shadow-xl transition-all duration-300 hover:z-20",
                      "opacity-100 animate-fade-in"
                    )}
                    onClick={() => handleImageClick(image)}
                    style={{
                      aspectRatio: aspectRatio || 1,
                      animationDelay: isLoaded ? `${index * 30}ms` : '0ms',
                      animationFillMode: 'forwards',
                    }}
                  >
                    {/* Image container with fixed aspect ratio */}
                    <div className="relative w-full h-full overflow-hidden rounded-lg">
                      <img
                        ref={(el) => {
                          if (el) imageRefs.current.set(image.id, el);
                        }}
                        src={image.imageUrl}
                        alt={`Query ${image.id}`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={() => handleImageError(image.id)}
                        style={{ display: 'block' }}
                      />
                  
                      {/* Gradient overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                      {/* Download/Share count badge - top right */}
                      <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-3 z-10 shadow-lg border border-white/10">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Download className="h-3.5 w-3.5" />
                          {image.downloadCount || 0}
                        </span>
                        <span className="w-px h-3 bg-white/30" />
                        <span className="flex items-center gap-1.5 font-medium">
                          <Share2 className="h-3.5 w-3.5" />
                          {image.shareCount || 0}
                        </span>
                      </div>

                      {/* Download button - bottom center, shown on hover */}
                      <div className="absolute bottom-0 left-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-20">
                        <Button
                          size="sm"
                          className="w-full bg-white/95 hover:bg-white text-black font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                          onClick={(e) => handleDownload(image, e)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Image
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

        </>
      )}

      {/* Expanded Image Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent 
          className="max-w-[95vw] w-[95vw] max-h-[95vh] h-[95vh] p-0 bg-black/98 backdrop-blur-sm border-none m-0 overflow-hidden !translate-x-[-50%] !translate-y-[-50%] !left-1/2 !top-1/2 shadow-2xl"
        >
          {selectedImage && (
            <div className="relative w-full h-full flex items-center justify-center p-2 sm:p-4 overflow-hidden">
              <DialogClose className="absolute top-3 right-3 z-50 rounded-full opacity-80 ring-offset-background transition-all duration-200 hover:opacity-100 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 disabled:pointer-events-none bg-black/60 backdrop-blur-sm text-white p-2.5 hover:scale-110">
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="sr-only">Close</span>
              </DialogClose>
              
              <img
                src={selectedImage.imageUrl}
                alt={`Query ${selectedImage.id}`}
                className="max-w-full max-h-[calc(95vh-100px)] sm:max-h-[calc(95vh-120px)] object-contain rounded-lg shadow-2xl"
                style={{ 
                  maxWidth: '100%',
                  maxHeight: 'calc(95vh - 100px)',
                  width: 'auto',
                  height: 'auto'
                }}
              />
              
              {/* Download button in modal */}
              <div className="absolute bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 z-50">
                <Button
                  size="sm"
                  onClick={(e) => handleDownload(selectedImage, e)}
                  className="bg-white/95 hover:bg-white text-black text-sm sm:text-base font-medium shadow-xl hover:shadow-2xl transition-all duration-200 px-6 py-2.5 rounded-full"
                >
                  <Download className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="hidden sm:inline">Download Image</span>
                  <span className="sm:hidden">Download</span>
                </Button>
              </div>

              {/* Stats in modal */}
              <div className="absolute top-4 sm:top-6 left-4 sm:left-6 bg-black/80 backdrop-blur-md text-white text-xs sm:text-sm px-4 sm:px-5 py-2 sm:py-2.5 rounded-full flex items-center gap-3 sm:gap-4 flex-wrap shadow-xl border border-white/10">
                <span className="flex items-center gap-2 font-medium">
                  <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{selectedImage.downloadCount || 0} Downloads</span>
                  <span className="sm:hidden">{selectedImage.downloadCount || 0} D</span>
                </span>
                <span className="w-px h-4 bg-white/30" />
                <span className="flex items-center gap-2 font-medium">
                  <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
