import { useState, useEffect } from 'react';
import API from '../services/api.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from './ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Search, Star, CheckCircle, XCircle, Eye, TrendingUp, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { ReviewsDebugger } from './ReviewsDebugger';

// Utility function to parse date string without timezone issues
const parseLocalDate = (dateString?: string): Date => {
  if (!dateString) {
    return new Date(); // Return current date if no date provided
  }

  // Handle ISO 8601 format from Supabase (e.g., "2024-12-11T10:30:00.000Z")
  if (dateString.includes('T')) {
    return new Date(dateString);
  }

  // Handle simple date format (e.g., "2024-12-11")
  const [year, month, day] = dateString.split('-').map(Number);
  if (year && month && day) {
    return new Date(year, month - 1, day);
  }

  // Fallback to Date constructor
  return new Date(dateString);
};

interface Review {
  id: string;
  customerId: string;          // Maps to customer_id in DB
  customerName?: string;        // Computed field
  barberId: string;             // Maps to barber_id in DB
  barberName?: string;          // Computed field
  appointmentId: string;        // Maps to appointment_id in DB
  rating: number;               // Maps to rating in DB
  comment: string;              // Maps to comment in DB
  showOnLanding: boolean;       // Maps to show_on_landing in DB
  createdAt: string;            // Maps to created_at in DB
  updatedAt: string;            // Maps to updated_at in DB
}

interface CustomerReviewsProps {
  isActive?: boolean;
}

export function CustomerReviews({ isActive = true }: CustomerReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRating, setFilterRating] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch reviews and related data from database
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);



      // Fetch all data in parallel
      const [reviewsData, usersData, barbersData] = await Promise.all([
        API.reviews.getAll(),
        API.users.getAll().catch((err) => {
          console.warn('⚠️ Failed to fetch users:', err);
          return [];
        }),
        API.barbers.getAll().catch((err) => {
          console.warn('⚠️ Failed to fetch barbers:', err);
          return [];
        })
      ]);



      setReviews(reviewsData || []);
      setUsers(usersData || []);
      setBarbers(barbersData || []);
    } catch (error) {
      console.error('❌ Error fetching reviews:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));

      // Show specific error message from backend
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to load reviews data';

      setError(errorMessage);
      toast.error(errorMessage + ' - Check browser console for details.');
      setReviews([]);
      setUsers([]);
      setBarbers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Refetch data when component becomes active (tab is switched)
  useEffect(() => {
    if (isActive) {

      fetchData();
    }
  }, [isActive]);

  // Helper to get customer name by ID
  const getCustomerName = (customerId?: string): string => {
    if (!customerId) return 'Unknown';
    const user = users.find(u => u.id === customerId);
    return user?.name || user?.email || 'Customer';
  };

  // Helper to get barber name by ID
  const getBarberName = (barberId?: string): string => {
    if (!barberId) return 'Any Barber';
    const barber = barbers.find(b => b.id === barberId);
    if (barber) {
      // Check both userId and user_id fields for compatibility
      const userId = barber.userId || barber.user_id;
      const user = users.find(u => u.id === userId);
      return user?.name || barber.name || 'Barber';
    }
    return 'Barber';
  };

  const filteredReviews = reviews.filter(review => {
    const customerName = review.customerName || getCustomerName(review.customerId);
    const barberName = review.barberName || getBarberName(review.barberId);


    const matchesSearch = customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      barberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (review.comment || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRating = filterRating === 'all' ||
      (filterRating === 'best' && review.rating === 5) ||
      (filterRating === '4+' && review.rating >= 4) ||
      review.rating.toString() === filterRating;

    return matchesSearch && matchesRating;
  });

  const toggleShowOnLanding = async (reviewId: string) => {
    try {
      const review = reviews.find(r => r.id === reviewId);
      if (!review) return;

      // Optimistically update UI
      setReviews(prev => prev.map(r =>
        r.id === reviewId
          ? { ...r, showOnLanding: !r.showOnLanding }
          : r
      ));

      // Update in database
      await API.reviews.toggleShowOnLanding(reviewId);

      toast.success(
        review.showOnLanding
          ? 'Review removed from landing page'
          : 'Review added to landing page'
      );
    } catch (error) {
      // Revert on error
      setReviews(prev => prev.map(r =>
        r.id === reviewId
          ? { ...r, showOnLanding: !r.showOnLanding }
          : r
      ));

      console.error('Error toggling review:', error);
      toast.error('Failed to update review');
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= rating
              ? 'fill-[#DB9D47] text-[#DB9D47]'
              : 'text-[#E8DCC8]'
              }`}
          />
        ))}
      </div>
    );
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const fiveStarCount = reviews.filter(r => r.rating === 5).length;
  const landingPageCount = reviews.filter(r => r.showOnLanding).length;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="flex items-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#DB9D47]" />
          <span className="ml-2 text-[#87765E]">Loading reviews data...</span>
        </div>
        <p className="text-sm text-[#87765E]">Connecting to backend...</p>
      </div>
    );
  }

  // Show error state with retry option
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-center space-y-2">
          <XCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h3 className="text-lg font-semibold text-[#5C4A3A]">Failed to Load Reviews</h3>
          <p className="text-sm text-[#87765E] max-w-md">{error}</p>
        </div>
        <Button
          onClick={fetchData}
          className="bg-[#DB9D47] hover:bg-[#C58A3C] text-white"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Debug Panel - Remove this after testing */}
      <ReviewsDebugger />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="flex flex-col p-3 sm:p-4 bg-white rounded-lg border border-[#E8DCC8] hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-[#DB9D47] p-2 sm:p-2.5 rounded-lg">
              <Star className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchData}
              className="h-6 w-6 p-0 hover:bg-[#FBF7EF]"
              title="Refresh data"
            >
              <RefreshCw className="w-3 h-3 text-[#87765E]" />
            </Button>
          </div>
          <p className="text-xl sm:text-2xl text-[#5C4A3A] mb-1 truncate">{reviews.length}</p>
          <p className="text-xs sm:text-sm text-[#87765E] truncate">Total Reviews</p>
        </div>

        <div className="flex flex-col p-3 sm:p-4 bg-white rounded-lg border border-[#E8DCC8] hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-[#F59E0B] p-2 sm:p-2.5 rounded-lg">
              <Star className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-[#94A670]" />
          </div>
          <p className="text-xl sm:text-2xl text-[#5C4A3A] mb-1 truncate">{averageRating}</p>
          <p className="text-xs sm:text-sm text-[#87765E] truncate">Average Rating</p>
        </div>

        <div className="flex flex-col p-3 sm:p-4 bg-white rounded-lg border border-[#E8DCC8] hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-[#94A670] p-2 sm:p-2.5 rounded-lg">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-[#94A670]" />
          </div>
          <p className="text-xl sm:text-2xl text-[#5C4A3A] mb-1 truncate">{fiveStarCount}</p>
          <p className="text-xs sm:text-sm text-[#87765E] truncate">5-Star Reviews</p>
        </div>

        <div className="flex flex-col p-3 sm:p-4 bg-white rounded-lg border border-[#E8DCC8] hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-[#D98555] p-2 sm:p-2.5 rounded-lg">
              <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-[#94A670]" />
          </div>
          <p className="text-xl sm:text-2xl text-[#5C4A3A] mb-1 truncate">{landingPageCount}</p>
          <p className="text-xs sm:text-sm text-[#87765E] truncate">On Landing Page</p>
        </div>
      </div>

      {/* Reviews Table */}
      <Card className="border-[#E8DCC8]">
        <CardHeader>
          <div>
            <CardTitle className="text-[#5C4A3A] flex items-center gap-2">
              <Star className="w-5 h-5 text-[#DB9D47]" />
              Customer Reviews
            </CardTitle>
            <CardDescription className="text-[#87765E]">
              Manage and showcase customer feedback
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#87765E]" />
              <Input
                placeholder="Search reviews by customer, barber, or comment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 border-[#E8DCC8] focus:ring-[#DB9D47]"
              />
            </div>
            <Select value={filterRating} onValueChange={setFilterRating}>
              <SelectTrigger className="w-full sm:w-56 border-[#E8DCC8]">
                <SelectValue placeholder="Filter by rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="best">Best Only (5 stars)</SelectItem>
                <SelectItem value="4+">4+ Stars</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results Count */}
          <div className="text-sm text-[#87765E]">
            Showing {filteredReviews.length} of {reviews.length} reviews
          </div>

          {/* Reviews Table */}
          <div className="border rounded-lg border-[#E8DCC8] overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#FBF7EF] hover:bg-[#FBF7EF]">
                  <TableHead className="text-[#5C4A3A]">Customer</TableHead>

                  <TableHead className="text-[#5C4A3A] hidden md:table-cell">Barber</TableHead>
                  <TableHead className="text-[#5C4A3A]">Rating</TableHead>
                  <TableHead className="text-[#5C4A3A] hidden sm:table-cell">Comment</TableHead>
                  <TableHead className="text-[#5C4A3A] hidden lg:table-cell">Date</TableHead>
                  <TableHead className="text-[#5C4A3A] text-center">Show</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReviews.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-[#87765E]">
                      {reviews.length === 0 ? 'No reviews yet' : 'No reviews found matching your criteria'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReviews.map((review) => {
                    const customerName = review.customerName || getCustomerName(review.customerId);
                    const barberName = review.barberName || getBarberName(review.barberId);


                    return (
                      <TableRow key={review.id} className="hover:bg-[#FFFDF8]">
                        <TableCell className="text-[#5C4A3A] text-sm">
                          <div>
                            {customerName}

                          </div>
                        </TableCell>

                        <TableCell className="text-[#87765E] text-sm hidden md:table-cell">
                          {barberName}
                        </TableCell>
                        <TableCell>{renderStars(review.rating)}</TableCell>
                        <TableCell className="max-w-xs hidden sm:table-cell">
                          <p className="text-sm text-[#5C4A3A] line-clamp-2">{review.comment || ''}</p>
                        </TableCell>
                        <TableCell className="text-sm text-[#87765E] hidden lg:table-cell">
                          {review.createdAt ? parseLocalDate(review.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          }) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Checkbox
                              checked={review.showOnLanding || false}
                              onCheckedChange={() => toggleShowOnLanding(review.id)}
                              className="border-[#E8DCC8] data-[state=checked]:bg-[#DB9D47] data-[state=checked]:border-[#DB9D47]"
                            />
                            {review.showOnLanding && (
                              <Eye className="w-4 h-4 text-[#DB9D47] hidden sm:block" />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Summary */}
          <div className="bg-[#FFF9F0] p-4 rounded-lg border border-[#E8DCC8]">
            <p className="text-sm text-[#5C4A3A]">
              <strong>Note:</strong> Reviews marked with "Show on Landing" will be displayed on the public landing page to attract new customers.
              We recommend featuring your best 5-star reviews.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
