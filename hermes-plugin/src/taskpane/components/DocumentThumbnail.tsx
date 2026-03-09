import * as React from "react";
import { makeStyles, mergeClasses } from "@fluentui/react-components";
import ProductIcon from "./ProductIcon";
import DarkTheme from "../utils/darkTheme";
import LightTheme from "../utils/lightTheme";
import { useTheme } from "../utils/themeContext";

const useStyles = makeStyles({
  thumbnail: {
    position: "relative",
    width: "48px",
    height: "48px",
    borderRadius: "4px",
    backgroundColor: DarkTheme.background.secondary,
    border: `1px solid ${DarkTheme.border.primary}`,
    flexShrink: 0,
    overflow: "hidden",
  },
  documentImage: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
  },
  productBadge: {
    position: "absolute",
    bottom: "2px",
    left: "2px",
  },
  statusIcon: {
    position: "absolute",
    top: "2px",
    right: "2px",
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
  },
  approved: {
    backgroundColor: DarkTheme.interactive.success,
    color: DarkTheme.text.primary,
  },
  obsolete: {
    backgroundColor: DarkTheme.status.obsolete.background,
    color: DarkTheme.status.obsolete.text,
  },
});

interface DocumentThumbnailProps {
  product?: string;
  status?: string;
  className?: string;
}

const DocumentThumbnail: React.FC<DocumentThumbnailProps> = ({ 
  product, 
  status,
  className 
}) => {
  const styles = useStyles();
  const { isDark } = useTheme();
  const theme = isDark ? DarkTheme : LightTheme;
  
  const isApproved = status?.toLowerCase() === "approved";
  const isObsolete = status?.toLowerCase() === "obsolete";
  
  return (
    <div className={mergeClasses(styles.thumbnail, className)} style={{ backgroundColor: theme.background.secondary, borderColor: theme.border.primary }}>
      {/* Base document image */}
      <img 
        src="./assets/document.png" 
        alt="Document"
        className={styles.documentImage}
        onError={(e) => {
          // Fallback if image doesn't load
          const target = e.target as HTMLImageElement;
          target.style.display = "none";
          target.parentElement!.style.backgroundColor = theme.background.tertiary;
          target.parentElement!.innerHTML += `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:${theme.text.tertiary};font-size:20px;">📄</div>`;
        }}
      />
      
      {/* Overlay for badges and status */}
      <div className={styles.overlay}>
        {/* Status icon */}
        {(isApproved || isObsolete) && (
          <div 
            className={styles.statusIcon}
            style={{
              backgroundColor: isApproved ? theme.interactive.success : theme.status.obsolete.background,
              color: isApproved ? theme.text.inverse : theme.status.obsolete.text,
            }}
          >
            {isApproved ? "✓" : "🗃"}
          </div>
        )}
        
        {/* Product badge */}
        {product && (
          <div className={styles.productBadge}>
            <ProductIcon product={product} size="small" />
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentThumbnail;