-- Create rate limits table for tracking request counts
CREATE TABLE public.rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier text NOT NULL,
  endpoint text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create unique constraint for identifier + endpoint combination
CREATE UNIQUE INDEX idx_rate_limits_identifier_endpoint ON public.rate_limits (identifier, endpoint);

-- Create index for cleanup of old records
CREATE INDEX idx_rate_limits_window_start ON public.rate_limits (window_start);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow edge functions (service role) to manage rate limits
-- No public access needed - only service role operates on this table

-- Function to check and update rate limit
-- Returns true if request is allowed, false if rate limited
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _identifier text,
  _endpoint text,
  _max_requests integer DEFAULT 10,
  _window_seconds integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_count integer;
  _window_start timestamp with time zone;
  _now timestamp with time zone := now();
  _window_cutoff timestamp with time zone := _now - (_window_seconds || ' seconds')::interval;
BEGIN
  -- Try to get existing rate limit record
  SELECT request_count, window_start INTO _current_count, _window_start
  FROM public.rate_limits
  WHERE identifier = _identifier AND endpoint = _endpoint
  FOR UPDATE;

  IF NOT FOUND THEN
    -- No existing record, create one
    INSERT INTO public.rate_limits (identifier, endpoint, request_count, window_start)
    VALUES (_identifier, _endpoint, 1, _now)
    ON CONFLICT (identifier, endpoint) 
    DO UPDATE SET 
      request_count = CASE 
        WHEN rate_limits.window_start < _window_cutoff THEN 1
        ELSE rate_limits.request_count + 1
      END,
      window_start = CASE 
        WHEN rate_limits.window_start < _window_cutoff THEN _now
        ELSE rate_limits.window_start
      END;
    RETURN true;
  END IF;

  -- Check if window has expired
  IF _window_start < _window_cutoff THEN
    -- Reset the window
    UPDATE public.rate_limits
    SET request_count = 1, window_start = _now
    WHERE identifier = _identifier AND endpoint = _endpoint;
    RETURN true;
  END IF;

  -- Check if limit exceeded
  IF _current_count >= _max_requests THEN
    RETURN false;
  END IF;

  -- Increment counter
  UPDATE public.rate_limits
  SET request_count = request_count + 1
  WHERE identifier = _identifier AND endpoint = _endpoint;
  
  RETURN true;
END;
$$;

-- Function to clean up old rate limit records (can be called periodically)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits(_older_than_hours integer DEFAULT 24)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _deleted_count integer;
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_start < now() - (_older_than_hours || ' hours')::interval;
  
  GET DIAGNOSTICS _deleted_count = ROW_COUNT;
  RETURN _deleted_count;
END;
$$;