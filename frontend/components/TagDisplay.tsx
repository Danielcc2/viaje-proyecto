import React from 'react';
import Link from 'next/link';

interface Tag {
  id: number;
  name: string;
  slug: string;
}

interface TagDisplayProps {
  tags: Tag[];
  className?: string;
  onClick?: (tag: Tag) => void;
  withLinks?: boolean;
}

// Función para convertir texto a formato capitalize (primera letra mayúscula, resto minúsculas)
const capitalizeText = (text: string): string => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

const TagDisplay: React.FC<TagDisplayProps> = ({ 
  tags, 
  className = "",
  onClick,
  withLinks = true
}) => {
  if (!tags || tags.length === 0) return null;
  
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map(tag => {
        const TagComponent = withLinks && !onClick ? Link : 'span';
        const props = withLinks && !onClick ? { 
          href: `/categorias/${tag.slug}`,
          key: tag.id,
          className: "bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-sm hover:bg-teal-100 transition-colors cursor-pointer"
        } : {
          key: tag.id,
          onClick: onClick ? () => onClick(tag) : undefined,
          className: "bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-sm hover:bg-teal-100 transition-colors cursor-pointer"
        };
        
        return (
          // @ts-ignore - Link expects href but span doesn't
          <TagComponent {...props}>
            {capitalizeText(tag.name)}
          </TagComponent>
        );
      })}
    </div>
  );
};

export default TagDisplay; 