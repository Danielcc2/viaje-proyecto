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
        if (withLinks && !onClick) {
          return (
            <Link 
              key={tag.id}
              href={`/categorias/${tag.slug}`}
              className="bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-sm hover:bg-teal-100 transition-colors cursor-pointer"
            >
              {capitalizeText(tag.name)}
            </Link>
          );
        } else {
          return (
            <span
              key={tag.id}
              onClick={onClick ? () => onClick(tag) : undefined}
              className="bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-sm hover:bg-teal-100 transition-colors cursor-pointer"
            >
              {capitalizeText(tag.name)}
            </span>
          );
        }
      })}
    </div>
  );
};

export default TagDisplay; 