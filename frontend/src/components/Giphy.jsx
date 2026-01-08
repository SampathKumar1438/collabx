import { useEffect, useState } from 'react';
import { GiphyFetch } from '@giphy/js-fetch-api';

// Using the API key provided
const gf = new GiphyFetch('aleG8gn2wuxaluFrSY4zEtiUnqPyGeDr');

function Giphy({ onSelect }) {
    const [value, setValue] = useState('');
    const [debouncedValue, setDebouncedValue] = useState('');
    const [gifs, setGifs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Debounce search input
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, 500);
        return () => clearTimeout(handler);
    }, [value]);

    // Fetch GIFs when debounced value changes
    useEffect(() => {
        const fetchGifs = async () => {
            setLoading(true);
            setError(null);
            try {
                const result = debouncedValue
                    ? await gf.search(debouncedValue, { limit: 20 })
                    : await gf.trending({ limit: 20 });
                setGifs(result.data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchGifs();
    }, [debouncedValue]);

    const handleGifSelect = (gif) => {
        if (onSelect) {
            onSelect(gif.images.original.url);
        }
    };

    return (
        <div className='w-full mt-3 bg-white dark:bg-boxdark rounded-lg border border-stroke dark:border-strokedark p-4 shadow-lg'>
            <input
                type="text"
                placeholder='Search Giphy'
                className='w-full rounded-md border border-stroke bg-gray px-4 py-2 text-black placeholder-body outline-none focus:border-primary focus:ring-primary dark:border-strokedark dark:bg-boxdark-2 dark:text-white'
                value={value}
                onChange={(e) => setValue(e.target.value)}
                aria-label='Search GIFs'
            />

            <div className='no-scrollbar h-48 overflow-y-auto pr-1 mt-3'>
                {loading && (
                    <div className="flex items-center justify-center py-8 text-center">
                        <span className="text-body dark:text-bodydark">Loading...</span>
                    </div>
                )}
                {error && (
                    <div className="rounded-lg bg-danger/10 px-4 py-3 text-center text-sm text-danger">
                        Error: {error}
                    </div>
                )}

                {!loading && !error && (
                    <div className="grid grid-cols-3 gap-2">
                        {gifs.map((gif) => (
                            <div
                                key={gif.id}
                                className="card-hover group cursor-pointer overflow-hidden rounded-lg"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleGifSelect(gif);
                                }}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleGifSelect(gif);
                                    }
                                }}
                                aria-label={`Select ${gif.title} GIF`}
                            >
                                <img
                                    src={gif.images.fixed_width.url}
                                    alt={gif.title || 'GIF'}
                                    className="h-24 w-full object-cover transition-transform duration-200 group-hover:scale-110"
                                    referrerPolicy="no-referrer"
                                    loading="lazy"
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Giphy;
