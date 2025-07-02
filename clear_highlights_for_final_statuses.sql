-- Clear highlighting for orders with final statuses
-- This function sets copied_by_warehouse = FALSE for orders that are cancelled, shipped, delivered, or completed

CREATE OR REPLACE FUNCTION clear_highlights_for_final_statuses()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE order_submissions 
    SET copied_by_warehouse = FALSE
    WHERE copied_by_warehouse = TRUE
    AND status IN ('cancelled', 'shipped', 'delivered', 'completed');
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Execute the function immediately to clear existing highlights
SELECT clear_highlights_for_final_statuses() as orders_cleared;

-- Optional: Create a trigger to automatically clear highlights when status changes to final
CREATE OR REPLACE FUNCTION auto_clear_highlight_on_final_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If status changed to a final status, clear the highlight
    IF NEW.status IN ('cancelled', 'shipped', 'delivered', 'completed') 
       AND OLD.status NOT IN ('cancelled', 'shipped', 'delivered', 'completed') THEN
        NEW.copied_by_warehouse = FALSE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS clear_highlight_on_final_status ON order_submissions;
CREATE TRIGGER clear_highlight_on_final_status
    BEFORE UPDATE ON order_submissions
    FOR EACH ROW
    EXECUTE FUNCTION auto_clear_highlight_on_final_status();

COMMENT ON FUNCTION clear_highlights_for_final_statuses() IS 'Clears copied_by_warehouse highlighting for orders with final statuses';
COMMENT ON FUNCTION auto_clear_highlight_on_final_status() IS 'Automatically clears highlighting when order status changes to final status'; 