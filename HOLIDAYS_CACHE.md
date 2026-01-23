# Holidays Cache Feature

## Overview

The holidays cache feature stores public and school holidays in your Supabase database to improve performance, reduce external API calls, and provide reliability when the external holiday API is unavailable.

## How It Works

### 1. **Cache-First Strategy**
When the app requests holidays:
1. **First Check**: Queries the local database cache for holidays in the requested date range
2. **If Found**: Returns cached holidays immediately (fast!)
3. **If Not Found**: Fetches from the external OpenHolidays API
4. **Auto-Save**: Automatically saves fetched holidays to the cache for future use

### 2. **Fallback Protection**
If the external API fails:
- The app automatically falls back to cached data
- Users can still view holidays even when the external API is down
- No interruption to the user experience

### 3. **Automatic Caching**
- Holidays are cached automatically when fetched from the API
- No manual intervention required
- Duplicate prevention ensures data integrity

## Setup

### 1. Run the Migration

The holidays cache requires a database migration. See `SUPABASE_SETUP.md` for complete instructions.

**Quick Setup:**
1. Open your Supabase dashboard → **SQL Editor**
2. Create a new query
3. Copy and paste the contents of `supabase/migrations/008_add_holidays_cache.sql`
4. Click "Run"
5. You should see "Success. No rows returned"

### 2. Verify Setup

After running the migration:
1. Check that the `holidays_cache` table exists in your Supabase dashboard
2. The table should be empty initially
3. Holidays will be automatically populated on first use

## Usage

The cache works transparently - no code changes needed! The API routes (`/api/holidays/public` and `/api/holidays/school`) automatically:
- Check the cache first
- Fall back to external API if needed
- Save results to cache

### First Request
```
User requests holidays → Cache empty → Fetch from API → Save to cache → Return data
```

### Subsequent Requests
```
User requests holidays → Cache hit → Return cached data (fast!)
```

### API Failure Scenario
```
User requests holidays → Cache hit → Return cached data (works even if API is down!)
```

## Database Schema

### `holidays_cache` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `country_code` | TEXT | ISO country code (e.g., 'DE', 'US') |
| `subdivision_code` | TEXT | Regional subdivision (nullable, e.g., 'DE-BY') |
| `language_code` | TEXT | Language for holiday names (default: 'EN') |
| `holiday_type` | TEXT | Either 'public' or 'school' |
| `holiday_id` | TEXT | Unique ID from external API |
| `start_date` | DATE | Holiday start date |
| `end_date` | DATE | Holiday end date |
| `holiday_data` | JSONB | Complete holiday object from API |
| `created_at` | TIMESTAMP | When the record was created |
| `updated_at` | TIMESTAMP | When the record was last updated |

### Indexes

The table includes optimized indexes for:
- Country and subdivision lookups
- Date range queries
- Holiday type filtering

## Benefits

### ⚡ Performance
- **Faster Response Times**: Cached data returns instantly
- **Reduced Latency**: No network calls to external API
- **Better User Experience**: Calendar loads faster

### 🛡️ Reliability
- **API Downtime Protection**: App works even when external API is down
- **Rate Limit Protection**: Reduces risk of hitting API rate limits
- **Network Resilience**: Works offline with cached data

### 💰 Cost Efficiency
- **Fewer API Calls**: Reduces external API usage
- **Lower Bandwidth**: Less data transferred
- **Reduced Server Load**: Less processing on external servers

## Monitoring

### Check Cache Status

1. **Supabase Dashboard**:
   - Go to **Table Editor** → `holidays_cache`
   - View cached holidays
   - Check `created_at` to see when holidays were cached

2. **Console Logs**:
   - Look for messages like:
     - `"Returning X public holidays from cache"`
     - `"Fetching public holidays from external API..."`
     - `"Cached X of Y public holidays"`

### Cache Statistics

You can query cache statistics in Supabase SQL Editor:

```sql
-- Count holidays by type
SELECT holiday_type, COUNT(*) as count
FROM holidays_cache
GROUP BY holiday_type;

-- Count holidays by country
SELECT country_code, COUNT(*) as count
FROM holidays_cache
GROUP BY country_code;

-- Date range of cached holidays
SELECT 
  MIN(start_date) as earliest_date,
  MAX(end_date) as latest_date
FROM holidays_cache;
```

## Maintenance

### Automatic Updates
- Holidays are automatically cached when fetched
- No manual refresh needed
- Cache grows organically as users request different date ranges

### Manual Cache Refresh
If you need to refresh the cache:
1. Delete old records from `holidays_cache` table
2. Next API request will fetch fresh data from external API
3. New data will be automatically cached

### Cache Cleanup (Optional)
You can periodically clean up old holidays:

```sql
-- Delete holidays older than 2 years
DELETE FROM holidays_cache
WHERE end_date < CURRENT_DATE - INTERVAL '2 years';
```

## Troubleshooting

### Cache Not Working

**Issue**: Holidays are always fetched from API, never from cache

**Solutions**:
1. Verify migration `008_add_holidays_cache.sql` ran successfully
2. Check that `holidays_cache` table exists in Supabase
3. Check console logs for error messages
4. Verify Supabase connection is working

### Stale Data

**Issue**: Holidays in cache are outdated

**Solutions**:
1. Delete old records from `holidays_cache` table
2. Next request will fetch fresh data
3. Consider implementing a TTL (Time To Live) policy if needed

### Duplicate Entries

**Issue**: Seeing duplicate holidays in cache

**Solutions**:
1. The unique index should prevent duplicates
2. If duplicates exist, check the unique constraint
3. Run the migration again to ensure indexes are created

## Technical Details

### API Route Changes

The following API routes were updated to support caching:
- `/api/holidays/public.ts` - Public holidays endpoint
- `/api/holidays/school.ts` - School holidays endpoint

Both routes now:
1. Check database cache first
2. Fall back to external API if cache miss
3. Save fetched data to cache
4. Return cached data if API fails

### Error Handling

The implementation includes robust error handling:
- Cache errors don't break the app (falls back to API)
- API errors fall back to cache
- Duplicate insert errors are gracefully ignored
- All errors are logged for debugging

## Future Enhancements

Potential improvements:
- [ ] TTL (Time To Live) for cache entries
- [ ] Background job to pre-populate cache
- [ ] Cache invalidation strategies
- [ ] Cache statistics dashboard
- [ ] Multi-country cache support optimization

## Support

For issues or questions:
1. Check console logs for error messages
2. Verify database migration ran successfully
3. Check Supabase dashboard → Logs for database errors
4. Review this documentation

