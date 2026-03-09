import * as React from "react";
import { getProductId, getProductColor, getContrastColor } from "../utils/productUtils";
import { makeStyles, mergeClasses } from "@fluentui/react-components";

const useStyles = makeStyles({
  avatar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "4px",
    fontWeight: "600",
    fontSize: "10px",
    textTransform: "uppercase",
    position: "relative",
    flexShrink: 0,
  },
  small: {
    width: "20px",
    height: "20px",
    fontSize: "8px",
  },
  medium: {
    width: "24px", 
    height: "24px",
    fontSize: "10px",
  },
  large: {
    width: "32px",
    height: "32px", 
    fontSize: "12px",
  },
});

type ProductIconSize = "small" | "medium" | "large";

interface ProductIconProps {
  product?: string;
  productData?: { abbreviation?: string; [key: string]: any };
  size?: ProductIconSize;
  className?: string;
}

// Product abbreviations from API response
const PRODUCT_ABBREVIATIONS: Record<string, string> = {
  "Boundary": "ICU",
  "Cloud Platform": "HCP", 
  "Consul": "CSL",
  "Engineering": "ENG",
  "Labs": "LAB",
  "MyProduct": "MY",
  "SRE": "SRE",
  "Terraform": "TFC",
  "Vagrant": "VGT",
  "Vault": "VLT",
  "Waypoint": "WP",
};

// HashiCorp product SVG icons from Flight Icons
// Using white/contrast colors to match web app's product-badge styling
const PRODUCT_ICONS: Record<string, string> = {
  terraform: `<svg viewBox="0 0 24 24" fill="none"><g fill="currentColor"><path d="M8.893 4.618l6.214 3.597v7.2l-6.214-3.6V4.618zM15.788 8.215v7.2l6.212-3.6V4.618l-6.212 3.597zM2 .6v7.197l6.212 3.6V4.2L2 .6zM8.893 19.8l6.212 3.6v-7.197l-6.212-3.6V19.8z"/></g></svg>`,
  
  vault: `<svg viewBox="0 0 16 16" fill="none"><path fill="currentColor" d="M0 0l7.971 15.516L16 0H0zm6.732 6.16h-1.27V4.89h1.27v1.27zm0-1.906h-1.27V2.985h1.27v1.269zm1.904 3.81h-1.27v-1.27h1.27v1.27zm0-1.905h-1.27V4.89h1.27v1.27zm0-1.905h-1.27V2.985h1.27v1.269zm1.894 1.905H9.26V4.89h1.27v1.27zM9.26 4.254V2.985h1.27v1.269H9.26z"/></svg>`,
  
  consul: `<svg viewBox="0 0 24 24" fill="none"><g fill="currentColor"><path d="M12.009 23a11 11 0 117.442-19.092l-2.61 2.73a7.229 7.229 0 100 10.73l2.61 2.73A10.97 10.97 0 0112.009 23zM20.86 17.498a.901.901 0 110-1.802.901.901 0 010 1.802z"/><path d="M11.939 14.383a2.383 2.383 0 11-.02-4.766 2.383 2.383 0 01.02 4.766zM21.895 14.426a.902.902 0 110-1.805.902.902 0 010 1.805zM19.214 14.313a.902.902 0 110-1.804.902.902 0 010 1.804zM21.895 11.387a.901.901 0 110-1.802.901.901 0 010 1.802zM19.214 11.49a.901.901 0 110-1.803.901.901 0 010 1.803zM20.913 8.355a.901.901 0 11-.004-1.803.901.901 0 01.004 1.803z"/></g></svg>`,
  
  nomad: `<svg viewBox="0 0 24 24" fill="none"><path fill="currentColor" d="M12 .5L2 6.25v11.5l10 5.75 10-5.75V6.25L12 .5zm4.456 12.646l-2.664 1.533-3.22-1.745v3.664l-3.026 1.911v-7.661l2.401-1.463 3.331 1.748v-3.74l3.185-1.902-.008 7.655z"/></svg>`,
  
  packer: `<svg viewBox="0 0 24 24" fill="none"><g fill="currentColor"><path fill-rule="evenodd" d="M5 3.311l7.42 4.308V23.5L5 19.192V3.312z" clip-rule="evenodd"/><path d="M16.095 5.168L8.028.5v3.238l5.488 3.184v9.723l2.58 1.49c1.598.925 2.904.38 2.904-1.233V9.768c-.002-1.604-1.312-3.672-2.905-4.6z"/></g></svg>`,
  
  boundary: `<svg viewBox="0 0 24 24" fill="none"><g fill="currentColor"><path d="M6.586 22v-1.55H9.8v-.958H8.241v-1.56h7.356L12.18 12l3.417-5.934H8.058v8.229H4V2h13.964l2.33 4.046L16.866 12l3.498 6.074L18.103 22H6.586z"/><path d="M7.21 17.932H5.656v1.56H7.21v-1.56zM5.556 20.438H4v1.56h1.556v-1.56z"/></g></svg>`,
  
  waypoint: `<svg viewBox="0 0 24 24" fill="none"><g fill="currentColor"><path d="M24 5l-2.997 5.194L18.006 5H24zM8 8.468H6l5 8.666L9 20.6 0 5h10l5 8.667 1-1.733L12 5h4l2 3.468 2 3.466-5 8.666L8 8.468z"/></g></svg>`,
  
  vagrant: `<svg viewBox="0 0 24 24" fill="none"><g fill="currentColor"><path d="M19.983.6l-4.96 2.877v1.767L12 12.384l-3.023-7.14V3.477L4.017.6 1 2.352v2.034l6.719 16.532L12 23.4l4.281-2.482L23 4.386V2.352L19.983.6z"/><path d="M8.977 5.244V3.477l-3.019 1.75v1.77l4.03 9.043L12 14.873v-2.488L8.977 5.244z"/></g></svg>`,
  
  hcp: `<svg viewBox="0 0 24 24" fill="none"><g fill="currentColor"><path d="M10.336 1.5L2 6.268v11.456l3.131 1.793V8.061l5.205-2.979V1.5z"/><path d="M13.664 1.5v9.123h-3.328V7.219L7.203 9.012V20.7l3.133 1.796V13.4h3.328v3.381l3.131-1.793V3.293L13.664 1.5z"/><path d="M13.664 22.5L22 17.732V6.276l-3.133-1.793v11.456l-5.203 2.979V22.5z"/></g></svg>`,
};

// Default folder icon (Unicode)
const FOLDER_ICON = "📁";

const ProductIcon: React.FC<ProductIconProps> = ({ product, productData, size = "small", className }) => {
  const styles = useStyles();
  
  // Follow exact Ember logic:
  // 1. If productID exists -> show icon
  // 2. Else if abbreviation exists -> show abbreviation text  
  // 3. Else -> show folder icon
  
  const productId = getProductId(product);
  // Use API abbreviation if available, fallback to hardcoded mappings
  const abbreviation = productData?.abbreviation || (product ? PRODUCT_ABBREVIATIONS[product] : undefined);
  
  // Determine what to show based on Ember logic
  const iconIsShown = !!productId || !abbreviation; // Show icon if productID exists OR no abbreviation
  const abbreviationIsShown = !productId && !!abbreviation; // Show abbreviation only if no productID but has abbreviation
  
  const sizeClass = size === "large" ? styles.large : size === "medium" ? styles.medium : styles.small;
  
  // Color logic: Follow Ember logic exactly
  // Products with productID get brand-colored backgrounds with white/contrast icons
  // Products without productID get hash-based colors for abbreviation text
  const style: React.CSSProperties = productId ? {
    // Brand-colored backgrounds for HashiCorp products (matching web gradients)
    backgroundColor: {
      'terraform': '#7B42BC',
      'vault': '#FFD814', 
      'consul': '#E03875',
      'nomad': '#06D092',
      'packer': '#02A8EF',
      'boundary': '#F24C53',
      'waypoint': '#14C6CB',
      'vagrant': '#1868F2',
      'hcp': '#000000',
    }[productId] || '#0078d4',
    color: productId === 'vault' ? '#000000' : '#ffffff', // Black text for yellow vault, white for others
  } : {
    // Hash-based colors for abbreviation text (like web app)
    backgroundColor: getProductColor(product) || '#6b7280',
    color: getContrastColor(getProductColor(product) || '#6b7280'),
  };

  return (
    <div 
      className={mergeClasses(styles.avatar, sizeClass, className)}
      style={style}
    >
      {iconIsShown ? (
        productId ? (
          // Show SVG product icon for known HashiCorp products
          <div 
            style={{ 
              width: size === "large" ? "16px" : size === "medium" ? "14px" : "12px",
              height: size === "large" ? "16px" : size === "medium" ? "14px" : "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "inherit",
            }}
            dangerouslySetInnerHTML={{ __html: PRODUCT_ICONS[productId] || `<span>${productId.charAt(0).toUpperCase()}</span>` }}
          />
        ) : (
          // Show folder icon for unknown products
          <span style={{ fontSize: size === "large" ? "14px" : size === "medium" ? "12px" : "10px" }}>
            {FOLDER_ICON}
          </span>
        )
      ) : abbreviationIsShown ? (
        <span style={{ 
          fontSize: size === "large" ? "9px" : size === "medium" ? "8px" : "7px",
          fontWeight: "bold",
          letterSpacing: "-0.3px"
        }}>
          {abbreviation && abbreviation.length > 3 ? abbreviation.slice(0, 1) : abbreviation}
        </span>
      ) : null}
    </div>
  );
};

export default ProductIcon;